import { ethers } from 'ethers';
import { PrismaClient, PaymentStatus, PaymentType, PaymentEventType } from '@prisma/client';
import { redis } from '../config/redis';
import { chainConfigs, supportedTokens, ChainName, TokenSymbol } from '../config/environment';
import { logger, logBlockchainOperation, logBusinessEvent } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Payment creation request interface
 */
export interface CreatePaymentRequest {
    merchantAddress: string;
    amount: string;
    token: TokenSymbol;
    chain: ChainName;
    customerEmail?: string;
    metadata?: Record<string, any>;
    yieldEnabled?: boolean;
    expiresAt?: Date;
}

/**
 * Core payment processing service
 * Handles payment creation, validation, and lifecycle management
 */
export class PaymentService {
    constructor() {
        // Service dependencies would be injected here
    }

    /**
     * Create a new payment
     */
    public async createPayment(request: CreatePaymentRequest, userId: string): Promise<any> {
        const startTime = Date.now();

        try {
            if (!userId) {
                throw new Error('User ID is required for payment creation');
            }

            // Validate request
            await this.validatePaymentRequest(request);

            // Find or create merchant
            const merchant = await this.findOrCreateMerchant(request.merchantAddress);

            // Create escrow transaction (mock)
            const escrowResult = await this.createEscrowTransaction(request);

            // Store payment in database
            const payment = await this.storePayment(userId, merchant.id, request, escrowResult);

            // Create payment event
            await this.createPaymentEvent(payment.id, PaymentEventType.CREATED, {
                escrowAddress: escrowResult.escrowAddress,
                transactionHash: escrowResult.transactionHash
            });

            // Cache payment for quick access
            await this.cachePayment(payment);

            // Log business event
            logBusinessEvent('payment_created', userId, {
                paymentId: payment.id,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
                yieldEnabled: request.yieldEnabled,
            });

            logger.info(`Payment created successfully: ${payment.id}`, {
                duration: Date.now() - startTime,
                paymentId: payment.id,
                merchantAddress: request.merchantAddress,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
            });

            return payment;

        } catch (error) {
            logger.error('Failed to create payment:', error);
            throw error;
        }
    }

    /**
     * Get payment by ID
     */
    public async getPayment(paymentId: string): Promise<any | null> {
        try {
            // Try cache first
            const cached = await this.getCachedPayment(paymentId);
            if (cached) {
                return cached;
            }

            // Fallback to database
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
                // Cache for future requests
                await this.cachePayment(payment);
                return payment;
            }

            return null;

        } catch (error) {
            logger.error(`Failed to get payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Update payment status
     */
    public async updatePaymentStatus(
        paymentId: string,
        status: PaymentStatus,
        transactionHash?: string,
        metadata?: Record<string, any>
    ): Promise<any> {
        try {
            const updateData: any = {
                status,
                updatedAt: new Date(),
            };

            if (transactionHash) {
                updateData.sourceTransactionHash = transactionHash;
            }

            if (metadata) {
                updateData.metadata = metadata;
            }

            if (status === PaymentStatus.CONFIRMED) {
                updateData.confirmedAt = new Date();
            } else if (status === PaymentStatus.COMPLETED) {
                updateData.releasedAt = new Date();
            }

            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: updateData,
            });

            // Create payment event
            const eventType = this.getEventTypeFromStatus(status);
            await this.createPaymentEvent(paymentId, eventType, {
                transactionHash,
                metadata
            });

            // Update cache
            await this.cachePayment(payment);

            // Log status change
            logBusinessEvent('payment_status_updated', undefined, {
                paymentId,
                status,
                transactionHash,
            });

            logger.info(`Payment status updated: ${paymentId} -> ${status}`);

            return payment;

        } catch (error) {
            logger.error(`Failed to update payment status ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Get payment history for a merchant
     */
    public async getMerchantPayments(
        merchantId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ payments: any[]; total: number }> {
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

        } catch (error) {
            logger.error(`Failed to get merchant payments for ${merchantId}:`, error);
            throw error;
        }
    }

    /**
     * Private helper methods
     */
    
    private async validatePaymentRequest(request: CreatePaymentRequest): Promise<void> {
        // Validate amount
        const amount = parseFloat(request.amount);
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        // Validate merchant address
        if (!ethers.isAddress(request.merchantAddress)) {
            throw new Error('Invalid merchant address');
        }

        // Validate chain and token combination
        const tokenConfig = supportedTokens[request.token];
        if (!tokenConfig?.addresses?.[request.chain]) {
            throw new Error(`Token ${request.token} not supported on chain ${request.chain}`);
        }

        // Validate expiration
        if (request.expiresAt && request.expiresAt <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }
    }

    private async findOrCreateMerchant(merchantAddress: string) {
        let merchant = await prisma.merchant.findFirst({
            where: {
                name: { contains: merchantAddress.slice(0, 8) }
            }
        });

        if (!merchant) {
            // Create a basic merchant record
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

    private async createEscrowTransaction(request: CreatePaymentRequest): Promise<any> {
        // This would interact with the smart contract to create an escrow
        const chainConfig = chainConfigs[request.chain];
        
        logBlockchainOperation('create_escrow', chainConfig.chainId, undefined, undefined, {
            amount: request.amount,
            token: request.token,
        });

        // Mock implementation - in reality this would call the smart contract
        return {
            escrowAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        };
    }

    private async storePayment(userId: string, merchantId: string, request: CreatePaymentRequest, escrowResult: any): Promise<any> {
        const tokenConfig = supportedTokens[request.token];
        const amountDecimal = parseFloat(request.amount);

        const payment = await prisma.payment.create({
            data: {
                userId,
                merchantId,
                amount: amountDecimal,
                currency: 'USD', // Default to USD, could be derived from token
                tokenAddress: tokenConfig?.addresses?.[request.chain] || '',
                tokenSymbol: request.token,
                status: PaymentStatus.PENDING,
                type: PaymentType.MERCHANT_PAYMENT,
                sourceChain: request.chain,
                destinationChain: request.chain,
                senderAddress: '0x0000000000000000000000000000000000000000', // Will be updated on confirmation
                recipientAddress: request.merchantAddress,
                escrowAddress: escrowResult.escrowAddress,
                estimatedYield: request.yieldEnabled ? amountDecimal * 0.05 : null, // 5% estimated yield
                yieldStrategy: request.yieldEnabled ? 'Circle USDC Lending' : null,
                description: `Payment to ${request.merchantAddress.slice(0, 8)}...`,
                metadata: request.metadata || {},
                expiresAt: request.expiresAt,
            },
        });

        return payment;
    }

    private async cachePayment(payment: any): Promise<void> {
        const cacheKey = `payment:${payment.id}`;
        await redis.set(cacheKey, JSON.stringify(payment), 3600); // Cache for 1 hour
    }

    private async getCachedPayment(paymentId: string): Promise<any | null> {
        const cacheKey = `payment:${paymentId}`;
        const cached = await redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }

    private async createPaymentEvent(
        paymentId: string, 
        eventType: PaymentEventType, 
        eventData?: any
    ): Promise<void> {
        await prisma.paymentEvent.create({
            data: {
                paymentId,
                eventType,
                eventData: eventData || {},
                createdAt: new Date()
            }
        });
    }

    private getEventTypeFromStatus(status: PaymentStatus): PaymentEventType {
        switch (status) {
            case PaymentStatus.CONFIRMED:
                return PaymentEventType.CONFIRMED;
            case PaymentStatus.COMPLETED:
                return PaymentEventType.RELEASED;
            case PaymentStatus.FAILED:
                return PaymentEventType.FAILED;
            case PaymentStatus.CANCELLED:
                return PaymentEventType.CANCELLED;
            default:
                return PaymentEventType.CREATED;
        }
    }
}