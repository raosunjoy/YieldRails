import { Request, Response, NextFunction } from 'express';
import { logger, logSecurityEvent } from '../utils/logger';
import { config, isProduction } from '../config/environment';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    public statusCode: number;
    public code: string;
    public isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Predefined error types
 */
export const ErrorTypes = {
    VALIDATION_ERROR: (message: string) => new ApiError(message, 400, 'VALIDATION_ERROR'),
    UNAUTHORIZED: (message: string = 'Unauthorized') => new ApiError(message, 401, 'UNAUTHORIZED'),
    FORBIDDEN: (message: string = 'Forbidden') => new ApiError(message, 403, 'FORBIDDEN'),
    NOT_FOUND: (message: string = 'Resource not found') => new ApiError(message, 404, 'NOT_FOUND'),
    CONFLICT: (message: string) => new ApiError(message, 409, 'CONFLICT'),
    RATE_LIMITED: (message: string = 'Too many requests') => new ApiError(message, 429, 'RATE_LIMITED'),
    INTERNAL_ERROR: (message: string = 'Internal server error') => new ApiError(message, 500, 'INTERNAL_ERROR'),
    SERVICE_UNAVAILABLE: (message: string = 'Service unavailable') => new ApiError(message, 503, 'SERVICE_UNAVAILABLE'),
    
    // Blockchain specific errors
    TRANSACTION_FAILED: (message: string) => new ApiError(message, 400, 'TRANSACTION_FAILED'),
    INSUFFICIENT_FUNDS: (message: string) => new ApiError(message, 400, 'INSUFFICIENT_FUNDS'),
    CONTRACT_ERROR: (message: string) => new ApiError(message, 500, 'CONTRACT_ERROR'),
    CHAIN_NOT_SUPPORTED: (message: string) => new ApiError(message, 400, 'CHAIN_NOT_SUPPORTED'),
    
    // Payment specific errors
    PAYMENT_NOT_FOUND: (paymentId: string) => new ApiError(`Payment ${paymentId} not found`, 404, 'PAYMENT_NOT_FOUND'),
    PAYMENT_EXPIRED: (paymentId: string) => new ApiError(`Payment ${paymentId} has expired`, 400, 'PAYMENT_EXPIRED'),
    INVALID_PAYMENT_STATUS: (status: string) => new ApiError(`Invalid payment status: ${status}`, 400, 'INVALID_PAYMENT_STATUS'),
    
    // Compliance errors
    ADDRESS_BLOCKED: (address: string) => new ApiError(`Address ${address} is blocked`, 403, 'ADDRESS_BLOCKED'),
    KYC_REQUIRED: (message: string = 'KYC verification required') => new ApiError(message, 403, 'KYC_REQUIRED'),
    COMPLIANCE_CHECK_FAILED: (message: string) => new ApiError(message, 403, 'COMPLIANCE_CHECK_FAILED'),
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
    error: Error | ApiError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Don't handle if response was already sent
    if (res.headersSent) {
        return next(error);
    }

    // Default error response
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: any = null;

    // Handle custom API errors
    if (error instanceof ApiError) {
        statusCode = error.statusCode;
        code = error.code;
        message = error.message;
    }
    // Handle validation errors from express-validator
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = error.message;
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
    }
    // Handle Prisma errors
    else if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error as any;
        if (prismaError.code === 'P2002') {
            statusCode = 409;
            code = 'DUPLICATE_ENTRY';
            message = 'Resource already exists';
        } else if (prismaError.code === 'P2025') {
            statusCode = 404;
            code = 'NOT_FOUND';
            message = 'Resource not found';
        }
    }
    // Handle ethers errors
    else if (error.message?.includes('CALL_EXCEPTION')) {
        statusCode = 400;
        code = 'CONTRACT_CALL_FAILED';
        message = 'Smart contract call failed';
    }
    else if (error.message?.includes('insufficient funds')) {
        statusCode = 400;
        code = 'INSUFFICIENT_FUNDS';
        message = 'Insufficient funds for transaction';
    }

    // Log the error
    const errorContext = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        requestId: req.id,
        statusCode,
        code,
    };

    if (statusCode >= 500) {
        logger.error({
            err: error,
            ...errorContext,
            msg: 'Server error occurred',
        });
    } else {
        logger.warn({
            err: error,
            ...errorContext,
            msg: 'Client error occurred',
        });
    }

    // Log security events for suspicious errors
    if (statusCode === 401 || statusCode === 403) {
        logSecurityEvent('authentication_failure', 'medium', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            error: message,
        });
    }

    // Prepare error response
    const errorResponse: any = {
        error: {
            code,
            message,
            timestamp: new Date().toISOString(),
            requestId: req.id,
        },
    };

    // Add stack trace in development
    if (!isProduction) {
        errorResponse.error.stack = error.stack;
        errorResponse.error.details = details;
    }

    // Add specific error details for client errors
    if (statusCode < 500 && details) {
        errorResponse.error.details = details;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
    const error = ErrorTypes.NOT_FOUND(`Route ${req.method} ${req.originalUrl} not found`);
    
    logger.warn({
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        msg: '404 - Route not found',
    });

    res.status(404).json({
        error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.id,
        },
    });
};

/**
 * Unhandled promise rejection handler
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error({
        err: reason,
        promise,
        msg: 'Unhandled Promise Rejection',
    });

    // In production, gracefully shut down
    if (isProduction) {
        process.exit(1);
    }
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error: Error) => {
    logger.fatal({
        err: error,
        msg: 'Uncaught Exception',
    });

    // Always exit on uncaught exception
    process.exit(1);
});