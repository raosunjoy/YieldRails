import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { ErrorTypes } from './errorHandler';

/**
 * Request validation middleware
 * Processes express-validator results and formats errors
 */
export const requestValidator = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value,
            location: error.location,
        }));

        logger.warn('Request validation failed', {
            method: req.method,
            url: req.url,
            errors: formattedErrors,
            userId: req.user?.id,
            ip: req.ip,
        });

        const error = ErrorTypes.VALIDATION_ERROR('Request validation failed');
        error.details = formattedErrors;
        
        throw error;
    }

    next();
};

/**
 * Request size limiter middleware
 */
export const requestSizeLimiter = (maxSizeMB: number = 10) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.get('content-length') || '0');
        const maxBytes = maxSizeMB * 1024 * 1024;

        if (contentLength > maxBytes) {
            logger.warn('Request size limit exceeded', {
                contentLength,
                maxBytes,
                url: req.url,
                ip: req.ip,
            });

            throw ErrorTypes.VALIDATION_ERROR(`Request size exceeds ${maxSizeMB}MB limit`);
        }

        next();
    };
};

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.id = req.get('X-Request-ID') || Math.random().toString(36).substr(2, 9);
    res.set('X-Request-ID', req.id);
    next();
};