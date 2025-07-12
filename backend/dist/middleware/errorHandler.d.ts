import { Request, Response, NextFunction } from 'express';
export declare class ApiError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare const ErrorTypes: {
    VALIDATION_ERROR: (message: string) => ApiError;
    UNAUTHORIZED: (message?: string) => ApiError;
    FORBIDDEN: (message?: string) => ApiError;
    NOT_FOUND: (message?: string) => ApiError;
    CONFLICT: (message: string) => ApiError;
    RATE_LIMITED: (message?: string) => ApiError;
    INTERNAL_ERROR: (message?: string) => ApiError;
    SERVICE_UNAVAILABLE: (message?: string) => ApiError;
    TRANSACTION_FAILED: (message: string) => ApiError;
    INSUFFICIENT_FUNDS: (message: string) => ApiError;
    CONTRACT_ERROR: (message: string) => ApiError;
    CHAIN_NOT_SUPPORTED: (message: string) => ApiError;
    PAYMENT_NOT_FOUND: (paymentId: string) => ApiError;
    PAYMENT_EXPIRED: (paymentId: string) => ApiError;
    INVALID_PAYMENT_STATUS: (status: string) => ApiError;
    ADDRESS_BLOCKED: (address: string) => ApiError;
    KYC_REQUIRED: (message?: string) => ApiError;
    COMPLIANCE_CHECK_FAILED: (message: string) => ApiError;
};
export declare const errorHandler: (error: Error | ApiError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=errorHandler.d.ts.map