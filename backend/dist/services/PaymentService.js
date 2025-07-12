"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = exports.PaymentEventType = exports.PaymentType = exports.PaymentStatus = void 0;
const ethers_1 = require("ethers");
const client_1 = require("@prisma/client");
const redis_1 = require("../config/redis");
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
var client_2 = require("@prisma/client");
Object.defineProperty(exports, "PaymentStatus", { enumerable: true, get: function () { return client_2.PaymentStatus; } });
Object.defineProperty(exports, "PaymentType", { enumerable: true, get: function () { return client_2.PaymentType; } });
Object.defineProperty(exports, "PaymentEventType", { enumerable: true, get: function () { return client_2.PaymentEventType; } });
const prisma = new client_1.PrismaClient();
class PaymentService {
    constructor() {
    }
    async createPayment(request, userId) {
        const startTime = Date.now();
        try {
            if (!userId) {
                throw new Error('User ID is required for payment creation');
            }
            await this.validatePaymentRequest(request);
            const merchant = await this.findOrCreateMerchant(request.merchantAddress);
            const escrowResult = await this.createEscrowTransaction(request);
            const payment = await this.storePayment(userId, merchant.id, request, escrowResult);
            await this.createPaymentEvent(payment.id, client_1.PaymentEventType.CREATED, {
                escrowAddress: escrowResult.escrowAddress,
                transactionHash: escrowResult.transactionHash
            });
            await this.cachePayment(payment);
            (0, logger_1.logBusinessEvent)('payment_created', userId, {
                paymentId: payment.id,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
                yieldEnabled: request.yieldEnabled,
            });
            logger_1.logger.info(`Payment created successfully: ${payment.id}`, {
                duration: Date.now() - startTime,
                paymentId: payment.id,
                merchantAddress: request.merchantAddress,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
            });
            return payment;
        }
        catch (error) {
            logger_1.logger.error('Failed to create payment:', error);
            throw error;
        }
    }
    async getPayment(paymentId) {
        try {
            const cached = await this.getCachedPayment(paymentId);
            if (cached) {
                return cached;
            }
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    user: true,
                    merchant: true,
                    yieldEarnings: true,
                    paymentEvents: true
                }
            });
            if (payment) {
                await this.cachePayment(payment);
                return payment;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get payment ${paymentId}:`, error);
            throw error;
        }
    }
    async updatePaymentStatus(paymentId, status, transactionHash, metadata) {
        try {
            const updateData = {
                status,
                updatedAt: new Date(),
            };
            if (transactionHash) {
                updateData.sourceTransactionHash = transactionHash;
            }
            if (metadata) {
                updateData.metadata = metadata;
            }
            if (status === client_1.PaymentStatus.CONFIRMED) {
                updateData.confirmedAt = new Date();
            }
            else if (status === client_1.PaymentStatus.COMPLETED) {
                updateData.releasedAt = new Date();
            }
            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: updateData,
            });
            const eventType = this.getEventTypeFromStatus(status);
            await this.createPaymentEvent(paymentId, eventType, {
                transactionHash,
                metadata
            });
            await this.cachePayment(payment);
            (0, logger_1.logBusinessEvent)('payment_status_updated', undefined, {
                paymentId,
                status,
                transactionHash,
            });
            logger_1.logger.info(`Payment status updated: ${paymentId} -> ${status}`);
            return payment;
        }
        catch (error) {
            logger_1.logger.error(`Failed to update payment status ${paymentId}:`, error);
            throw error;
        }
    }
    async getMerchantPayments(merchantId, limit = 50, offset = 0) {
        try {
            const [payments, total] = await Promise.all([
                prisma.payment.findMany({
                    where: { merchantId },
                    include: {
                        user: true,
                        yieldEarnings: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.payment.count({
                    where: { merchantId },
                }),
            ]);
            return {
                payments,
                total,
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to get merchant payments for ${merchantId}:`, error);
            throw error;
        }
    }
    async validatePaymentRequest(request) {
        const amount = parseFloat(request.amount);
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }
        if (!ethers_1.ethers.isAddress(request.merchantAddress)) {
            throw new Error('Invalid merchant address');
        }
        const tokenConfig = environment_1.supportedTokens[request.token];
        if (!tokenConfig?.addresses) {
            throw new Error(`Token ${request.token} not supported`);
        }
        const chainAddresses = tokenConfig.addresses;
        if (!chainAddresses[request.chain]) {
            throw new Error(`Token ${request.token} not supported on chain ${request.chain}`);
        }
        if (request.expiresAt && request.expiresAt <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }
    }
    async findOrCreateMerchant(merchantAddress) {
        let merchant = await prisma.merchant.findFirst({
            where: {
                name: { contains: merchantAddress.slice(0, 8) }
            }
        });
        if (!merchant) {
            merchant = await prisma.merchant.create({
                data: {
                    name: `Merchant ${merchantAddress.slice(0, 8)}`,
                    email: `merchant+${merchantAddress.slice(0, 8)}@example.com`,
                    defaultCurrency: 'USD',
                    supportedChains: ['ethereum'],
                    verificationStatus: 'PENDING'
                }
            });
        }
        return merchant;
    }
    async createEscrowTransaction(request) {
        const chainConfig = environment_1.chainConfigs[request.chain];
        (0, logger_1.logBlockchainOperation)('create_escrow', chainConfig.chainId, undefined, undefined, {
            amount: request.amount,
            token: request.token,
        });
        return {
            escrowAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        };
    }
    async storePayment(userId, merchantId, request, escrowResult) {
        const tokenConfig = environment_1.supportedTokens[request.token];
        const amountDecimal = parseFloat(request.amount);
        const chainAddresses = tokenConfig?.addresses;
        const tokenAddress = chainAddresses?.[request.chain] || '';
        const payment = await prisma.payment.create({
            data: {
                userId,
                merchantId,
                amount: amountDecimal,
                currency: 'USD',
                tokenAddress,
                tokenSymbol: request.token,
                status: client_1.PaymentStatus.PENDING,
                type: client_1.PaymentType.MERCHANT_PAYMENT,
                sourceChain: request.chain,
                destinationChain: request.chain,
                senderAddress: '0x0000000000000000000000000000000000000000',
                recipientAddress: request.merchantAddress,
                escrowAddress: escrowResult.escrowAddress,
                estimatedYield: request.yieldEnabled ? amountDecimal * 0.05 : null,
                yieldStrategy: request.yieldEnabled ? 'Circle USDC Lending' : null,
                description: `Payment to ${request.merchantAddress.slice(0, 8)}...`,
                metadata: request.metadata || {},
                expiresAt: request.expiresAt,
            },
        });
        return payment;
    }
    async cachePayment(payment) {
        const cacheKey = `payment:${payment.id}`;
        await redis_1.redis.set(cacheKey, JSON.stringify(payment), 3600);
    }
    async getCachedPayment(paymentId) {
        const cacheKey = `payment:${paymentId}`;
        const cached = await redis_1.redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
    async createPaymentEvent(paymentId, eventType, eventData) {
        await prisma.paymentEvent.create({
            data: {
                paymentId,
                eventType,
                eventData: eventData || {},
                createdAt: new Date()
            }
        });
    }
    getEventTypeFromStatus(status) {
        switch (status) {
            case client_1.PaymentStatus.CONFIRMED:
                return client_1.PaymentEventType.CONFIRMED;
            case client_1.PaymentStatus.COMPLETED:
                return client_1.PaymentEventType.RELEASED;
            case client_1.PaymentStatus.FAILED:
                return client_1.PaymentEventType.FAILED;
            case client_1.PaymentStatus.CANCELLED:
                return client_1.PaymentEventType.CANCELLED;
            default:
                return client_1.PaymentEventType.CREATED;
        }
    }
    async confirmPayment(paymentId, transactionHash) {
        try {
            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: client_1.PaymentStatus.CONFIRMED,
                    destTransactionHash: transactionHash,
                    confirmedAt: new Date()
                }
            });
            await this.logPaymentEvent(paymentId, client_1.PaymentEventType.CONFIRMED, {
                transactionHash,
                confirmedAt: new Date()
            });
            (0, logger_1.logBusinessEvent)('payment_confirmed', 'payment', { paymentId, transactionHash });
            return payment;
        }
        catch (error) {
            logger_1.logger.error('Error confirming payment:', error);
            throw error;
        }
    }
    async releasePayment(paymentId) {
        try {
            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: client_1.PaymentStatus.COMPLETED
                }
            });
            await this.logPaymentEvent(paymentId, client_1.PaymentEventType.RELEASED, {
                releasedAt: new Date()
            });
            (0, logger_1.logBusinessEvent)('payment_released', 'payment', { paymentId });
            return payment;
        }
        catch (error) {
            logger_1.logger.error('Error releasing payment:', error);
            throw error;
        }
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=PaymentService.js.map