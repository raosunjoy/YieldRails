import pino from 'pino';
import { config, isDevelopment, isProduction } from '../config/environment';

/**
 * Structured logger configuration using Pino
 */
const loggerConfig: pino.LoggerOptions = {
    level: config.LOG_LEVEL,
    formatters: {
        level: (label: string) => {
            return { level: label };
        },
        log: (object: any) => {
            const { req, res, ...rest } = object;
            return rest;
        },
    },
    serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
        service: 'yieldrails-api',
        version: config.API_VERSION,
        environment: config.NODE_ENV,
    },
};

// Development-specific configuration
if (isDevelopment) {
    loggerConfig.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{msg}',
            errorLikeObjectKeys: ['err', 'error'],
        },
    };
}

// Production-specific configuration
if (isProduction) {
    loggerConfig.redact = {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.privateKey',
            'req.body.apiKey',
            'privateKey',
            'password',
            'secret',
            'token',
            'authorization',
        ],
        censor: '[REDACTED]',
    };
}

export const logger = pino(loggerConfig);

/**
 * Child logger factory for specific contexts
 */
export const createChildLogger = (context: Record<string, any>) => {
    return logger.child(context);
};

/**
 * Request logger middleware
 */
export const requestLogger = (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Add request ID for tracing
    req.id = req.id || Math.random().toString(36).substr(2, 9);
    
    // Create child logger with request context
    req.logger = logger.child({
        requestId: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
    });

    // Log request start
    req.logger.info({
        msg: 'Request started',
        headers: req.headers,
        query: req.query,
        body: req.body,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
        const duration = Date.now() - startTime;
        
        req.logger.info({
            msg: 'Request completed',
            statusCode: res.statusCode,
            duration,
            responseHeaders: res.getHeaders(),
        });

        originalEnd.call(this, chunk, encoding);
    };

    next();
};

/**
 * Error logger utility
 */
export const logError = (error: Error, context?: Record<string, any>) => {
    logger.error({
        err: error,
        ...context,
        msg: 'Error occurred',
        stack: error.stack,
    });
};

/**
 * Performance logger for critical operations
 */
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
    logger.info({
        msg: 'Performance metric',
        operation,
        duration,
        ...metadata,
    });
};

/**
 * Blockchain operation logger
 */
export const logBlockchainOperation = (
    operation: string,
    chainId: number,
    txHash?: string,
    gasUsed?: number,
    metadata?: Record<string, any>
) => {
    logger.info({
        msg: 'Blockchain operation',
        operation,
        chainId,
        txHash,
        gasUsed,
        ...metadata,
    });
};

/**
 * Security event logger
 */
export const logSecurityEvent = (
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
) => {
    logger.warn({
        msg: 'Security event',
        event,
        severity,
        ...details,
    });
};

/**
 * API metrics logger
 */
export const logApiMetrics = (
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string
) => {
    logger.info({
        msg: 'API metrics',
        endpoint,
        method,
        statusCode,
        duration,
        userId,
    });
};

/**
 * Business event logger for analytics
 */
export const logBusinessEvent = (
    event: string,
    userId?: string,
    metadata?: Record<string, any>
) => {
    logger.info({
        msg: 'Business event',
        event,
        userId,
        ...metadata,
    });
};

export default logger;