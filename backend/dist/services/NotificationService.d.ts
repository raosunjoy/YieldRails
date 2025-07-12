import { Payment } from '@prisma/client';
export declare class NotificationService {
    sendPaymentCreated(payment: Payment, customerEmail?: string): Promise<void>;
    sendPaymentStatusUpdate(payment: Payment): Promise<void>;
}
//# sourceMappingURL=NotificationService.d.ts.map