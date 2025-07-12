"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = exports.requestSizeLimiter = exports.requestValidator = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("./errorHandler");
const requestValidator = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: 'param' in error ? error.param : 'unknown',
            message: error.msg,
            value: 'value' in error ? error.value : undefined,
            location: 'location' in error ? error.location : 'unknown',
        }));
        logger_1.logger.warn('Request validation failed', {
            method: req.method,
            url: req.url,
            errors: formattedErrors,
            userId: req.user?.id,
            ip: req.ip,
        });
        const error = errorHandler_1.ErrorTypes.VALIDATION_ERROR('Request validation failed');
        error.details = formattedErrors;
        throw error;
    }
    next();
};
exports.requestValidator = requestValidator;
const requestSizeLimiter = (maxSizeMB = 10) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length') || '0');
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (contentLength > maxBytes) {
            logger_1.logger.warn('Request size limit exceeded', {
                contentLength,
                maxBytes,
                url: req.url,
                ip: req.ip,
            });
            throw errorHandler_1.ErrorTypes.VALIDATION_ERROR(`Request size exceeds ${maxSizeMB}MB limit`);
        }
        next();
    };
};
exports.requestSizeLimiter = requestSizeLimiter;
const requestIdMiddleware = (req, res, next) => {
    req.id = req.get('X-Request-ID') || Math.random().toString(36).substr(2, 9);
    res.set('X-Request-ID', req.id);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
//# sourceMappingURL=requestValidator.js.map