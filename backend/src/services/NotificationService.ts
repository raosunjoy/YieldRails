import { PrismaClient, NotificationType, NotificationChannel } from '@prisma/client';
import { logger, logBusinessEvent } from '../utils/logger';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Notification service for emails, webhooks, and real-time updates
 */
export class NotificationService {
    private webhookRetryAttempts = 3;
    private webhookTimeout = 10000; // 10 seconds

    /**
     * Send payment created notification
     */
    public async sendPaymentCreated(payment: any, customerEmail?: string): Promise<void> {
        try {
            logger.info(`Sending payment created notification: ${payment.id}`);

            // Create notification record
            await this.createNotification(
                payment.userId,
                NotificationType.PAYMENT_RECEIVED,
                'Payment Created',
                `Your payment of ${payment.amount} ${payment.tokenSymbol} has been created`,
                {
                    paymentId: payment.id,
                    amount: payment.amount,
                    currency: payment.tokenSymbol
                }
            );

            // Send email if customer email provided
            if (customerEmail) {
                await this.sendEmail(
                    customerEmail,
                    'Payment Created - YieldRails',
                    this.generatePaymentCreatedEmailTemplate(payment)
                );
            }

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'payment:created', payment);

            logBusinessEvent('notification_sent', payment.userId, {
                type: 'payment_created',
                paymentId: payment.id
            });

        } catch (error) {
            logger.error(`Failed to send payment created notification for ${payment.id}:`, error);
        }
    }

    /**
     * Send payment status update notification
     */
    public async sendPaymentStatusUpdate(payment: any): Promise<void> {
        try {
            logger.info(`Sending payment status update: ${payment.id} -> ${payment.status}`);

            const notificationType = this.getNotificationTypeFromStatus(payment.status);
            const title = this.getStatusUpdateTitle(payment.status);
            const message = this.getStatusUpdateMessage(payment);

            // Create notification record
            await this.createNotification(
                payment.userId,
                notificationType,
                title,
                message,
                {
                    paymentId: payment.id,
                    status: payment.status,
                    amount: payment.amount
                }
            );

            // Send email notification
            if (payment.user?.email) {
                await this.sendEmail(
                    payment.user.email,
                    `${title} - YieldRails`,
                    this.generateStatusUpdateEmailTemplate(payment)
                );
            }

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'payment:status_updated', {
                paymentId: payment.id,
                status: payment.status,
                actualYield: payment.actualYield
            });

            logBusinessEvent('notification_sent', payment.userId, {
                type: 'payment_status_update',
                paymentId: payment.id,
                status: payment.status
            });

        } catch (error) {
            logger.error(`Failed to send payment status update for ${payment.id}:`, error);
        }
    }

    /**
     * Send yield update notification
     */
    public async sendYieldUpdate(payment: any, yieldAmount: string): Promise<void> {
        try {
            // Create notification record
            await this.createNotification(
                payment.userId,
                NotificationType.YIELD_EARNED,
                'Yield Earned',
                `You've earned ${yieldAmount} ${payment.tokenSymbol} in yield`,
                {
                    paymentId: payment.id,
                    yieldAmount,
                    currency: payment.tokenSymbol
                }
            );

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'yield:updated', {
                paymentId: payment.id,
                yieldAmount,
                totalYield: payment.actualYield
            });

        } catch (error) {
            logger.error(`Failed to send yield update for ${payment.id}:`, error);
        }
    }

    /**
     * Send payment failed notification
     */
    public async sendPaymentFailed(payment: any, error: any): Promise<void> {
        try {
            // Create notification record
            await this.createNotification(
                payment.userId,
                NotificationType.SECURITY_ALERT,
                'Payment Failed',
                `Your payment of ${payment.amount} ${payment.tokenSymbol} has failed`,
                {
                    paymentId: payment.id,
                    error: error.message,
                    amount: payment.amount
                }
            );

            // Send email notification
            if (payment.user?.email) {
                await this.sendEmail(
                    payment.user.email,
                    'Payment Failed - YieldRails',
                    this.generatePaymentFailedEmailTemplate(payment, error)
                );
            }

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'payment:failed', {
                paymentId: payment.id,
                error: error.message
            });

        } catch (error) {
            logger.error(`Failed to send payment failed notification for ${payment.id}:`, error);
        }
    }

    /**
     * Send payment cancelled notification
     */
    public async sendPaymentCancelled(payment: any, reason?: string): Promise<void> {
        try {
            // Create notification record
            await this.createNotification(
                payment.userId,
                NotificationType.SYSTEM_UPDATE,
                'Payment Cancelled',
                `Your payment of ${payment.amount} ${payment.tokenSymbol} has been cancelled`,
                {
                    paymentId: payment.id,
                    reason,
                    amount: payment.amount
                }
            );

            // Send email notification
            if (payment.user?.email) {
                await this.sendEmail(
                    payment.user.email,
                    'Payment Cancelled - YieldRails',
                    this.generatePaymentCancelledEmailTemplate(payment, reason)
                );
            }

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'payment:cancelled', {
                paymentId: payment.id,
                reason
            });

        } catch (error) {
            logger.error(`Failed to send payment cancelled notification for ${payment.id}:`, error);
        }
    }

    /**
     * Send webhook notification to merchant
     */
    public async sendWebhook(webhookUrl: string, payload: any): Promise<void> {
        let attempt = 0;
        
        while (attempt < this.webhookRetryAttempts) {
            try {
                const response = await axios.post(webhookUrl, payload, {
                    timeout: this.webhookTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'YieldRails-Webhook/1.0',
                        'X-YieldRails-Signature': this.generateWebhookSignature(payload)
                    }
                });

                if (response.status >= 200 && response.status < 300) {
                    logger.info(`Webhook sent successfully to ${webhookUrl}`, {
                        attempt: attempt + 1,
                        status: response.status
                    });
                    return;
                }

                throw new Error(`Webhook returned status ${response.status}`);

            } catch (error) {
                attempt++;
                logger.warn(`Webhook attempt ${attempt} failed for ${webhookUrl}:`, error);

                if (attempt >= this.webhookRetryAttempts) {
                    logger.error(`All webhook attempts failed for ${webhookUrl}`, {
                        attempts: this.webhookRetryAttempts,
                        payload
                    });
                    break;
                }

                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }
    }

    /**
     * Send email notification
     */
    public async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
        try {
            // Mock email implementation - in production, integrate with SendGrid, SES, etc.
            logger.info(`Sending email to ${to}`, { subject });
            
            // Here you would integrate with your email service
            // Example: await sendgrid.send({ to, subject, html: htmlContent });
            
            logBusinessEvent('email_sent', undefined, {
                to,
                subject
            });

        } catch (error) {
            logger.error(`Failed to send email to ${to}:`, error);
        }
    }

    /**
     * Send bridge completion notification
     */
    public async sendBridgeCompletionNotification(
        paymentId: string,
        bridgeTransactionId: string,
        destinationAmount: string
    ): Promise<void> {
        try {
            // Get payment details to find user
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: { user: true }
            });

            if (!payment) {
                logger.warn(`Payment not found for bridge completion notification: ${paymentId}`);
                return;
            }

            const notification = await this.createNotification(
                payment.userId,
                'CROSS_CHAIN_COMPLETED' as any,
                'Cross-Chain Transfer Completed',
                `Your cross-chain transfer has been completed successfully. Amount received: ${destinationAmount}`,
                {
                    paymentId,
                    bridgeTransactionId,
                    destinationAmount,
                    type: 'bridge_completion'
                }
            );

            // Send email notification
            if (payment.user.email) {
                await this.sendEmail(
                    payment.user.email,
                    'Cross-Chain Transfer Completed - YieldRails',
                    `Your cross-chain transfer has been completed successfully. Amount received: ${destinationAmount}`
                );
            }

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'bridge:completed', {
                paymentId,
                bridgeTransactionId,
                destinationAmount
            });

            logger.info('Bridge completion notification sent', { paymentId, bridgeTransactionId });

        } catch (error) {
            logger.error('Failed to send bridge completion notification', { error, paymentId });
        }
    }

    /**
     * Send bridge failure notification
     */
    public async sendBridgeFailureNotification(
        paymentId: string,
        bridgeTransactionId: string,
        reason: string
    ): Promise<void> {
        try {
            // Get payment details to find user
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: { user: true }
            });

            if (!payment) {
                logger.warn(`Payment not found for bridge failure notification: ${paymentId}`);
                return;
            }

            const notification = await this.createNotification(
                payment.userId,
                'SYSTEM_UPDATE' as any,
                'Cross-Chain Transfer Failed',
                `Your cross-chain transfer has failed: ${reason}. Please contact support for assistance.`,
                {
                    paymentId,
                    bridgeTransactionId,
                    reason,
                    type: 'bridge_failure'
                }
            );

            // Send email notification
            if (payment.user.email) {
                await this.sendEmail(
                    payment.user.email,
                    'Cross-Chain Transfer Failed - YieldRails',
                    `Your cross-chain transfer has failed: ${reason}. Please contact support for assistance.`
                );
            }

            // Broadcast real-time update
            await this.broadcastRealTime(payment.userId, 'bridge:failed', {
                paymentId,
                bridgeTransactionId,
                reason
            });

            logger.info('Bridge failure notification sent', { paymentId, bridgeTransactionId, reason });

        } catch (error) {
            logger.error('Failed to send bridge failure notification', { error, paymentId });
        }
    }

    /**
     * Broadcast real-time update via WebSocket
     */
    public async broadcastRealTime(userId: string, event: string, data: any): Promise<void> {
        try {
            // Mock WebSocket implementation - in production, integrate with Socket.IO, etc.
            logger.info(`Broadcasting real-time update to user ${userId}`, { event, data });
            
            // Here you would broadcast via your WebSocket service
            // Example: io.to(userId).emit(event, data);
            
        } catch (error) {
            logger.error(`Failed to broadcast real-time update to ${userId}:`, error);
        }
    }

    /**
     * Create notification record in database
     */
    private async createNotification(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        data?: any
    ): Promise<void> {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    data: data || {},
                    channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
                }
            });
        } catch (error) {
            logger.error('Failed to create notification record:', error);
        }
    }

    /**
     * Helper methods for notification content generation
     */

    private getNotificationTypeFromStatus(status: string): NotificationType {
        switch (status) {
            case 'CONFIRMED':
                return NotificationType.PAYMENT_RECEIVED;
            case 'COMPLETED':
                return NotificationType.PAYMENT_COMPLETED;
            case 'FAILED':
                return NotificationType.SECURITY_ALERT;
            default:
                return NotificationType.SYSTEM_UPDATE;
        }
    }

    private getStatusUpdateTitle(status: string): string {
        switch (status) {
            case 'CONFIRMED':
                return 'Payment Confirmed';
            case 'COMPLETED':
                return 'Payment Completed';
            case 'FAILED':
                return 'Payment Failed';
            case 'CANCELLED':
                return 'Payment Cancelled';
            default:
                return 'Payment Update';
        }
    }

    private getStatusUpdateMessage(payment: any): string {
        switch (payment.status) {
            case 'CONFIRMED':
                return `Your payment of ${payment.amount} ${payment.tokenSymbol} has been confirmed and is now generating yield`;
            case 'COMPLETED':
                return `Your payment of ${payment.amount} ${payment.tokenSymbol} has been completed. Total yield earned: ${payment.actualYield || 0} ${payment.tokenSymbol}`;
            case 'FAILED':
                return `Your payment of ${payment.amount} ${payment.tokenSymbol} has failed. Please contact support if you need assistance`;
            case 'CANCELLED':
                return `Your payment of ${payment.amount} ${payment.tokenSymbol} has been cancelled`;
            default:
                return `Your payment status has been updated to ${payment.status}`;
        }
    }

    private generateWebhookSignature(payload: any): string {
        // In production, use HMAC with a secret key
        const secret = process.env.WEBHOOK_SECRET || 'default-secret';
        const crypto = require('crypto');
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    private generatePaymentCreatedEmailTemplate(payment: any): string {
        return `
            <html>
                <body>
                    <h2>Payment Created Successfully</h2>
                    <p>Your payment has been created and is now processing.</p>
                    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                        <h3>Payment Details</h3>
                        <p><strong>Amount:</strong> ${payment.amount} ${payment.tokenSymbol}</p>
                        <p><strong>Payment ID:</strong> ${payment.id}</p>
                        <p><strong>Estimated Yield:</strong> ${payment.estimatedYield || 0} ${payment.tokenSymbol}</p>
                        <p><strong>Created:</strong> ${new Date(payment.createdAt).toLocaleString()}</p>
                    </div>
                    <p>You will receive updates as your payment progresses and generates yield.</p>
                    <p>Best regards,<br>YieldRails Team</p>
                </body>
            </html>
        `;
    }

    private generateStatusUpdateEmailTemplate(payment: any): string {
        return `
            <html>
                <body>
                    <h2>Payment Status Update</h2>
                    <p>Your payment status has been updated.</p>
                    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                        <h3>Payment Details</h3>
                        <p><strong>Status:</strong> ${payment.status}</p>
                        <p><strong>Amount:</strong> ${payment.amount} ${payment.tokenSymbol}</p>
                        <p><strong>Payment ID:</strong> ${payment.id}</p>
                        <p><strong>Current Yield:</strong> ${payment.actualYield || 0} ${payment.tokenSymbol}</p>
                        <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>Best regards,<br>YieldRails Team</p>
                </body>
            </html>
        `;
    }

    private generatePaymentFailedEmailTemplate(payment: any, error: any): string {
        return `
            <html>
                <body>
                    <h2>Payment Failed</h2>
                    <p>Unfortunately, your payment has failed to process.</p>
                    <div style="background: #ffe6e6; padding: 20px; margin: 20px 0;">
                        <h3>Payment Details</h3>
                        <p><strong>Amount:</strong> ${payment.amount} ${payment.tokenSymbol}</p>
                        <p><strong>Payment ID:</strong> ${payment.id}</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p><strong>Failed At:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>Please contact our support team if you need assistance.</p>
                    <p>Best regards,<br>YieldRails Team</p>
                </body>
            </html>
        `;
    }

    private generatePaymentCancelledEmailTemplate(payment: any, reason?: string): string {
        return `
            <html>
                <body>
                    <h2>Payment Cancelled</h2>
                    <p>Your payment has been cancelled.</p>
                    <div style="background: #fff3cd; padding: 20px; margin: 20px 0;">
                        <h3>Payment Details</h3>
                        <p><strong>Amount:</strong> ${payment.amount} ${payment.tokenSymbol}</p>
                        <p><strong>Payment ID:</strong> ${payment.id}</p>
                        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                        <p><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Best regards,<br>YieldRails Team</p>
                </body>
            </html>
        `;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get user notifications
     */
    public async getUserNotifications(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<any> {
        try {
            const [notifications, unreadCount] = await Promise.all([
                prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset
                }),
                prisma.notification.count({
                    where: { userId, isRead: false }
                })
            ]);

            return {
                notifications,
                unreadCount,
                total: notifications.length
            };
        } catch (error) {
            logger.error(`Failed to get notifications for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    public async markAsRead(notificationId: string, userId: string): Promise<void> {
        try {
            await prisma.notification.update({
                where: { 
                    id: notificationId,
                    userId // Ensure user can only mark their own notifications
                },
                data: { 
                    isRead: true,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            logger.error(`Failed to mark notification ${notificationId} as read:`, error);
            throw error;
        }
    }

    /**
     * Send system alert notification
     */
    public async sendSystemAlert(title: string, message: string, data?: any): Promise<void> {
        try {
            logger.warn('System alert:', { title, message, data });

            // In production, this would send alerts to admin users or monitoring systems
            // For now, we'll just log the alert
            
            // You could also send to a Slack channel, PagerDuty, etc.
            // await this.sendSlackAlert(title, message);
            // await this.sendPagerDutyAlert(title, message);

            logBusinessEvent('system_alert', 'system', {
                title,
                message,
                data
            });

        } catch (error) {
            logger.error('Failed to send system alert:', error);
        }
    }
}