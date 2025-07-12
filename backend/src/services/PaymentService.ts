import { ethers } from 'ethers';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { chainConfigs, supportedTokens, ChainName, TokenSymbol } from '../config/environment';
import { logger, logBlockchainOperation, logBusinessEvent } from '../utils/logger';
import { ContractService } from './ContractService';
import { YieldService } from './YieldService';
import { ComplianceService } from './ComplianceService';
import { NotificationService } from './NotificationService';

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
 * Payment status enum
 */
export enum PaymentStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
    REFUNDED = 'REFUNDED',
}

/**
 * Payment entity interface
 */
export interface Payment {
    id: string;
    merchantAddress: string;
    customerAddress?: string;
    amount: string;
    token: TokenSymbol;
    chain: ChainName;
    status: PaymentStatus;
    transactionHash?: string;
    escrowAddress?: string;
    yieldEnabled: boolean;
    yieldEarned?: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    metadata?: Record<string, any>;
}

/**
 * Core payment processing service
 * Handles payment creation, validation, and lifecycle management
 */
export class PaymentService {
    private contractService: ContractService;
    private yieldService: YieldService;
    private complianceService: ComplianceService;
    private notificationService: NotificationService;

    constructor() {
        this.contractService = new ContractService();
        this.yieldService = new YieldService();
        this.complianceService = new ComplianceService();
        this.notificationService = new NotificationService();
    }

    /**
     * Create a new payment
     */
    public async createPayment(request: CreatePaymentRequest, userId?: string): Promise<Payment> {
        const startTime = Date.now();

        try {
            // Validate request
            await this.validatePaymentRequest(request);

            // Check compliance
            await this.complianceService.checkMerchant(request.merchantAddress);

            // Generate unique payment ID
            const paymentId = this.generatePaymentId();

            // Create escrow transaction
            const escrowResult = await this.createEscrowTransaction(paymentId, request);

            // Store payment in database
            const payment = await this.storePayment(paymentId, request, escrowResult);

            // Cache payment for quick access
            await this.cachePayment(payment);

            // Send notifications
            await this.notificationService.sendPaymentCreated(payment, request.customerEmail);

            // Log business event
            logBusinessEvent('payment_created', userId, {
                paymentId,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
                yieldEnabled: request.yieldEnabled,
            });

            logger.info(`Payment created successfully: ${paymentId}`, {
                duration: Date.now() - startTime,
                paymentId,
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
    public async getPayment(paymentId: string): Promise<Payment | null> {
        try {
            // Try cache first
            const cached = await this.getCachedPayment(paymentId);
            if (cached) {
                return cached;
            }

            // Fallback to database
            const db = database.getClient();
            const payment = await db.payment.findUnique({
                where: { id: paymentId },
            });

            if (payment) {
                // Cache for future requests
                await this.cachePayment(payment as Payment);
                return payment as Payment;
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
    ): Promise<Payment> {
        try {
            const db = database.getClient();

            const payment = await db.payment.update({
                where: { id: paymentId },
                data: {
                    status,
                    transactionHash,
                    metadata: metadata ? JSON.stringify(metadata) : undefined,
                    updatedAt: new Date(),
                },
            });

            // Update cache
            await this.cachePayment(payment as Payment);

            // Send status update notification
            await this.notificationService.sendPaymentStatusUpdate(payment as Payment);

            // Log status change
            logBusinessEvent('payment_status_updated', undefined, {
                paymentId,
                status,
                transactionHash,
            });

            logger.info(`Payment status updated: ${paymentId} -> ${status}`);

            return payment as Payment;

        } catch (error) {
            logger.error(`Failed to update payment status ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Process payment confirmation
     */
    public async confirmPayment(paymentId: string, customerAddress: string): Promise<Payment> {
        const startTime = Date.now();

        try {
            const payment = await this.getPayment(paymentId);
            if (!payment) {
                throw new Error(`Payment not found: ${paymentId}`);
            }

            if (payment.status !== PaymentStatus.PENDING) {
                throw new Error(`Payment ${paymentId} is not in pending status`);
            }

            // Check if payment has expired
            if (payment.expiresAt && payment.expiresAt < new Date()) {
                await this.updatePaymentStatus(paymentId, PaymentStatus.EXPIRED);
                throw new Error(`Payment ${paymentId} has expired`);
            }

            // Compliance check on customer
            await this.complianceService.checkAddress(customerAddress);

            // Process the deposit transaction
            const depositResult = await this.processDepositTransaction(payment, customerAddress);

            // Update payment with customer address and transaction hash
            const updatedPayment = await this.updatePaymentStatus(
                paymentId,
                PaymentStatus.CONFIRMED,
                depositResult.transactionHash,
                { customerAddress, escrowAddress: depositResult.escrowAddress }
            );

            // Start yield generation if enabled
            if (payment.yieldEnabled) {
                await this.yieldService.startYieldGeneration(paymentId, {
                    amount: payment.amount,
                    token: payment.token,
                    chain: payment.chain,
                    escrowAddress: depositResult.escrowAddress,
                });
            }

            logBusinessEvent('payment_confirmed', undefined, {
                paymentId,
                customerAddress,
                transactionHash: depositResult.transactionHash,
                duration: Date.now() - startTime,
            });

            return updatedPayment;

        } catch (error) {
            logger.error(`Failed to confirm payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Release payment to merchant
     */
    public async releasePayment(paymentId: string, merchantId: string): Promise<Payment> {
        const startTime = Date.now();

        try {
            const payment = await this.getPayment(paymentId);
            if (!payment) {
                throw new Error(`Payment not found: ${paymentId}`);
            }

            if (payment.status !== PaymentStatus.CONFIRMED) {
                throw new Error(`Payment ${paymentId} cannot be released in current status: ${payment.status}`);
            }

            // Verify merchant authorization
            if (payment.merchantAddress.toLowerCase() !== merchantId.toLowerCase()) {
                throw new Error(`Unauthorized: merchant ${merchantId} cannot release payment ${paymentId}`);
            }

            // Calculate final yield if applicable
            let yieldEarned = '0';
            if (payment.yieldEnabled) {
                yieldEarned = await this.yieldService.calculateFinalYield(paymentId);
            }

            // Process release transaction
            const releaseResult = await this.processReleaseTransaction(payment, yieldEarned);

            // Update payment status
            const updatedPayment = await this.updatePaymentStatus(
                paymentId,
                PaymentStatus.COMPLETED,
                releaseResult.transactionHash,
                { 
                    yieldEarned,
                    releaseTransactionHash: releaseResult.transactionHash,
                    completedAt: new Date().toISOString(),
                }
            );

            logBusinessEvent('payment_released', merchantId, {
                paymentId,
                yieldEarned,
                transactionHash: releaseResult.transactionHash,
                duration: Date.now() - startTime,
            });

            return updatedPayment;

        } catch (error) {
            logger.error(`Failed to release payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Get payment history for a merchant
     */
    public async getMerchantPayments(
        merchantAddress: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ payments: Payment[]; total: number }> {
        try {
            const db = database.getClient();

            const [payments, total] = await Promise.all([
                db.payment.findMany({
                    where: { merchantAddress: merchantAddress.toLowerCase() },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                db.payment.count({
                    where: { merchantAddress: merchantAddress.toLowerCase() },
                }),
            ]);

            return {
                payments: payments as Payment[],
                total,
            };

        } catch (error) {
            logger.error(`Failed to get merchant payments for ${merchantAddress}:`, error);
            throw error;
        }
    }

    /**
     * Private helper methods
     */
    
    private async validatePaymentRequest(request: CreatePaymentRequest): Promise<void> {
        // Validate amount
        const amount = ethers.parseUnits(request.amount, supportedTokens[request.token].decimals);
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        // Validate merchant address
        if (!ethers.isAddress(request.merchantAddress)) {
            throw new Error('Invalid merchant address');
        }

        // Validate chain and token combination
        const tokenConfig = supportedTokens[request.token];
        if (!tokenConfig.addresses[request.chain]) {
            throw new Error(`Token ${request.token} not supported on chain ${request.chain}`);
        }

        // Validate expiration
        if (request.expiresAt && request.expiresAt <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }
    }

    private generatePaymentId(): string {
        return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async createEscrowTransaction(paymentId: string, request: CreatePaymentRequest): Promise<any> {
        // This would interact with the smart contract to create an escrow
        const chainConfig = chainConfigs[request.chain];
        
        logBlockchainOperation('create_escrow', chainConfig.chainId, undefined, undefined, {
            paymentId,
            amount: request.amount,
            token: request.token,
        });

        // Mock implementation - in reality this would call the smart contract
        return {
            escrowAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        };
    }

    private async processDepositTransaction(payment: Payment, customerAddress: string): Promise<any> {
        // This would handle the actual deposit to the escrow contract
        const chainConfig = chainConfigs[payment.chain];
        
        logBlockchainOperation('process_deposit', chainConfig.chainId, undefined, undefined, {
            paymentId: payment.id,
            customerAddress,
            amount: payment.amount,
        });

        // Mock implementation
        return {
            escrowAddress: payment.escrowAddress,
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        };
    }

    private async processReleaseTransaction(payment: Payment, yieldEarned: string): Promise<any> {
        // This would handle the release from escrow to merchant
        const chainConfig = chainConfigs[payment.chain];
        
        logBlockchainOperation('release_payment', chainConfig.chainId, undefined, undefined, {
            paymentId: payment.id,
            merchantAddress: payment.merchantAddress,
            yieldEarned,
        });

        // Mock implementation
        return {
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        };
    }

    private async storePayment(paymentId: string, request: CreatePaymentRequest, escrowResult: any): Promise<Payment> {
        const db = database.getClient();

        const payment = await db.payment.create({
            data: {
                id: paymentId,
                merchantAddress: request.merchantAddress.toLowerCase(),
                amount: request.amount,
                token: request.token,
                chain: request.chain,
                status: PaymentStatus.PENDING,
                escrowAddress: escrowResult.escrowAddress,
                yieldEnabled: request.yieldEnabled || false,
                expiresAt: request.expiresAt,
                metadata: request.metadata ? JSON.stringify(request.metadata) : null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return payment as Payment;
    }

    private async cachePayment(payment: Payment): Promise<void> {
        const cacheKey = `payment:${payment.id}`;
        await redis.set(cacheKey, JSON.stringify(payment), 3600); // Cache for 1 hour
    }

    private async getCachedPayment(paymentId: string): Promise<Payment | null> {
        const cacheKey = `payment:${paymentId}`;
        const cached = await redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
}