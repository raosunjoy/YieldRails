"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ErrorTypes = exports.ApiError = void 0;
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
class ApiError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
exports.ErrorTypes = {
    VALIDATION_ERROR: (message) => new ApiError(message, 400, 'VALIDATION_ERROR'),
    UNAUTHORIZED: (message = 'Unauthorized') => new ApiError(message, 401, 'UNAUTHORIZED'),
    FORBIDDEN: (message = 'Forbidden') => new ApiError(message, 403, 'FORBIDDEN'),
    NOT_FOUND: (message = 'Resource not found') => new ApiError(message, 404, 'NOT_FOUND'),
    CONFLICT: (message) => new ApiError(message, 409, 'CONFLICT'),
    RATE_LIMITED: (message = 'Too many requests') => new ApiError(message, 429, 'RATE_LIMITED'),
    INTERNAL_ERROR: (message = 'Internal server error') => new ApiError(message, 500, 'INTERNAL_ERROR'),
    SERVICE_UNAVAILABLE: (message = 'Service unavailable') => new ApiError(message, 503, 'SERVICE_UNAVAILABLE'),
    TRANSACTION_FAILED: (message) => new ApiError(message, 400, 'TRANSACTION_FAILED'),
    INSUFFICIENT_FUNDS: (message) => new ApiError(message, 400, 'INSUFFICIENT_FUNDS'),
    CONTRACT_ERROR: (message) => new ApiError(message, 500, 'CONTRACT_ERROR'),
    CHAIN_NOT_SUPPORTED: (message) => new ApiError(message, 400, 'CHAIN_NOT_SUPPORTED'),
    PAYMENT_NOT_FOUND: (paymentId) => new ApiError(`Payment ${paymentId} not found`, 404, 'PAYMENT_NOT_FOUND'),
    PAYMENT_EXPIRED: (paymentId) => new ApiError(`Payment ${paymentId} has expired`, 400, 'PAYMENT_EXPIRED'),
    INVALID_PAYMENT_STATUS: (status) => new ApiError(`Invalid payment status: ${status}`, 400, 'INVALID_PAYMENT_STATUS'),
    ADDRESS_BLOCKED: (address) => new ApiError(`Address ${address} is blocked`, 403, 'ADDRESS_BLOCKED'),
    KYC_REQUIRED: (message = 'KYC verification required') => new ApiError(message, 403, 'KYC_REQUIRED'),
    COMPLIANCE_CHECK_FAILED: (message) => new ApiError(message, 403, 'COMPLIANCE_CHECK_FAILED'),
};
const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details = null;
    if (error instanceof ApiError) {
        statusCode = error.statusCode;
        code = error.code;
        message = error.message;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = error.message;
    }
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
    else if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
        if (prismaError.code === 'P2002') {
            statusCode = 409;
            code = 'DUPLICATE_ENTRY';
            message = 'Resource already exists';
        }
        else if (prismaError.code === 'P2025') {
            statusCode = 404;
            code = 'NOT_FOUND';
            message = 'Resource not found';
        }
    }
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
        logger_1.logger.error({
            err: error,
            ...errorContext,
            msg: 'Server error occurred',
        });
    }
    else {
        logger_1.logger.warn({
            err: error,
            ...errorContext,
            msg: 'Client error occurred',
        });
    }
    if (statusCode === 401 || statusCode === 403) {
        (0, logger_1.logSecurityEvent)('authentication_failure', 'medium', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            error: message,
        });
    }
    const errorResponse = {
        error: {
            code,
            message,
            timestamp: new Date().toISOString(),
            requestId: req.id,
        },
    };
    if (!environment_1.isProduction) {
        errorResponse.error.stack = error.stack;
        errorResponse.error.details = details;
    }
    if (statusCode < 500 && details) {
        errorResponse.error.details = details;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFoundHandler = (req, res) => {
    const error = exports.ErrorTypes.NOT_FOUND(`Route ${req.method} ${req.originalUrl} not found`);
    logger_1.logger.warn({
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
exports.notFoundHandler = notFoundHandler;
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error({
        err: reason,
        promise,
        msg: 'Unhandled Promise Rejection',
    });
    if (environment_1.isProduction) {
        process.exit(1);
    }
});
process.on('uncaughtException', (error) => {
    logger_1.logger.fatal({
        err: error,
        msg: 'Uncaught Exception',
    });
    process.exit(1);
});
//# sourceMappingURL=errorHandler.js.map