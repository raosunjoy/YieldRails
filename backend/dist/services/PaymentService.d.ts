import { PaymentStatus } from '@prisma/client';
import { ChainName, TokenSymbol } from '../config/environment';
export { PaymentStatus, PaymentType, PaymentEventType } from '@prisma/client';
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
export declare class PaymentService {
    constructor();
    createPayment(request: CreatePaymentRequest, userId: string): Promise<any>;
    getPayment(paymentId: string): Promise<any | null>;
    updatePaymentStatus(paymentId: string, status: PaymentStatus, transactionHash?: string, metadata?: Record<string, any>): Promise<any>;
    getMerchantPayments(merchantId: string, limit?: number, offset?: number): Promise<{
        payments: any[];
        total: number;
    }>;
    private validatePaymentRequest;
    private findOrCreateMerchant;
    private createEscrowTransaction;
    private storePayment;
    private cachePayment;
    private getCachedPayment;
    private createPaymentEvent;
    private getEventTypeFromStatus;
    confirmPayment(paymentId: string, transactionHash: string): Promise<any>;
    releasePayment(paymentId: string): Promise<any>;
}
//# sourceMappingURL=PaymentService.d.ts.map