import { ethers } from 'ethers';
import { supportedTokens, ChainName, TokenSymbol } from '../../config/environment';
import { CreatePaymentRequest } from './types';

/**
 * Payment validation utilities
 */
export class PaymentValidator {
    /**
     * Validate payment creation request
     */
    static async validatePaymentRequest(request: CreatePaymentRequest): Promise<void> {
        // Validate amount
        const amount = parseFloat(request.amount);
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        if (amount > 1000000) {
            throw new Error('Payment amount exceeds maximum limit');
        }

        // Validate merchant address
        if (!ethers.isAddress(request.merchantAddress)) {
            throw new Error('Invalid merchant address');
        }

        // Validate chain and token combination
        const tokenConfig = supportedTokens[request.token];
        if (!tokenConfig?.addresses) {
            throw new Error(`Token ${request.token} not supported`);
        }
        
        const chainAddresses = tokenConfig.addresses as Record<string, string>;
        if (!chainAddresses[request.chain]) {
            throw new Error(`Token ${request.token} not supported on chain ${request.chain}`);
        }

        // Validate expiration
        if (request.expiresAt && request.expiresAt <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }

        // Validate metadata size
        if (request.metadata && JSON.stringify(request.metadata).length > 10000) {
            throw new Error('Metadata size exceeds maximum limit');
        }
    }

    /**
     * Validate payment status transition
     */
    static validateStatusTransition(currentStatus: string, newStatus: string): boolean {
        const validTransitions: Record<string, string[]> = {
            'pending': ['CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED'],
            'PENDING': ['CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED'],
            'confirmed': ['COMPLETED', 'FAILED', 'CANCELLED'],
            'CONFIRMED': ['COMPLETED', 'FAILED', 'CANCELLED'],
            'completed': [],
            'COMPLETED': [],
            'failed': [],
            'FAILED': [],
            'cancelled': [],
            'CANCELLED': []
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Validate user permissions for payment operation
     */
    static validateUserPermissions(
        userId: string, 
        payment: any, 
        operation: string
    ): boolean {
        switch (operation) {
            case 'view':
                return payment.userId === userId || payment.merchantId === userId;
            case 'cancel':
                return payment.userId === userId;
            case 'release':
                return payment.merchantId === userId;
            default:
                return false;
        }
    }
}