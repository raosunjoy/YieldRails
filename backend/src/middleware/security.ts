import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';
import { logger, logSecurityEvent } from '../utils/logger';
import { ErrorTypes } from './errorHandler';
import { redis } from '../config/redis';
import xss from 'xss';
import validator from 'validator';

/**
 * Enhanced security middleware configuration
 */
export const securityMiddleware = {
    /**
     * Enhanced helmet configuration with strict security headers
     */
    enhancedHelmet: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-origin' },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
    }),

    /**
     * Advanced CORS configuration
     */
    corsOptions: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            const allowedOrigins = config.ALLOWED_ORIGINS.split(',');
            
            // Allow requests with no origin (like mobile apps, curl, etc)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.indexOf(origin) === -1) {
                logSecurityEvent('cors_violation', 'medium', {
                    origin,
                    allowedOrigins,
                });
                return callback(new Error('CORS policy violation'), false);
            }
            
            return callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID'],
        credentials: true,
        maxAge: 86400,
    },

    /**
     * Redis-backed rate limiter for better performance and distributed rate limiting
     */
    redisRateLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: config.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
        // Redis store for distributed rate limiting
        store: {
            incr: async (key: string) => {
                try {
                    const client = redis.getClient();
                    const result = await client.incr(key);
                    await client.expire(key, 15 * 60); // 15 minutes in seconds
                    return result;
                } catch (error) {
                    logger.error('Redis rate limit error:', error);
                    return 1; // Fallback to allow request if Redis fails
                }
            },
            decrement: async (key: string) => {
                try {
                    const client = redis.getClient();
                    await client.decr(key);
                } catch (error) {
                    logger.error('Redis rate limit decrement error:', error);
                }
            },
            resetKey: async (key: string) => {
                try {
                    await redis.del(key);
                } catch (error) {
                    logger.error('Redis rate limit reset error:', error);
                }
            },
        },
        keyGenerator: (req: Request) => {
            // Use IP and user ID if available for more accurate rate limiting
            return req.user?.id 
                ? `rate-limit:${req.ip}:${req.user.id}` 
                : `rate-limit:${req.ip}`;
        },
        skip: (req: Request) => {
            // Skip rate limiting for health checks and certain paths
            return req.path === '/api/health' || req.path === '/api/health/check';
        },
        handler: (req: Request, res: Response) => {
            logSecurityEvent('rate_limit_exceeded', 'medium', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                userId: req.user?.id,
            });
            
            res.status(429).json({
                error: {
                    code: 'RATE_LIMITED',
                    message: 'Too many requests, please try again later',
                    timestamp: new Date().toISOString(),
                    retryAfter: Math.ceil(15 * 60 / 60), // minutes
                }
            });
        },
    }),

    /**
     * API-specific rate limiters for sensitive endpoints
     */
    authRateLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 attempts per 15 minutes
        standardHeaders: true,
        message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts' } },
        keyGenerator: (req: Request) => `auth-rate-limit:${req.ip}`,
    }),

    /**
     * Input sanitization middleware
     * Sanitizes request body, query parameters, and URL parameters
     */
    inputSanitizer: (req: Request, res: Response, next: NextFunction) => {
        try {
            // Sanitize request body
            if (req.body && typeof req.body === 'object') {
                req.body = sanitizeObject(req.body);
            }
            
            // Sanitize query parameters
            if (req.query && typeof req.query === 'object') {
                req.query = sanitizeObject(req.query);
            }
            
            // Sanitize URL parameters
            if (req.params && typeof req.params === 'object') {
                req.params = sanitizeObject(req.params);
            }
            
            next();
        } catch (error) {
            logger.error('Input sanitization error:', error);
            next(ErrorTypes.VALIDATION_ERROR('Invalid input data'));
        }
    },

    /**
     * Audit logging middleware for sensitive operations
     */
    auditLogger: (req: Request, res: Response, next: NextFunction) => {
        // Define sensitive operations patterns
        const sensitiveOperations = [
            { path: /\/api\/auth\/.*/, method: 'POST' },
            { path: /\/api\/payments\/.*\/release/, method: 'POST' },
            { path: /\/api\/admin\/.*/, method: 'ALL' },
            { path: /\/api\/compliance\/.*/, method: 'POST' },
            { path: /\/api\/crosschain\/bridge/, method: 'POST' },
        ];
        
        // Check if current request matches sensitive operations
        const isSensitiveOperation = sensitiveOperations.some(op => {
            return op.path.test(req.path) && (op.method === 'ALL' || op.method === req.method);
        });
        
        if (isSensitiveOperation) {
            // Create audit log entry
            const auditLog = {
                timestamp: new Date().toISOString(),
                userId: req.user?.id || 'anonymous',
                userRole: req.user?.role || 'anonymous',
                operation: `${req.method} ${req.path}`,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                requestId: req.id,
                requestParams: {
                    query: req.query,
                    body: sanitizeAuditData(req.body),
                    params: req.params,
                },
            };
            
            // Log audit event
            logger.info({
                msg: 'Audit log',
                audit: auditLog,
            });
        }
        
        next();
    },

    /**
     * Security headers middleware
     * Adds additional security headers not covered by helmet
     */
    additionalSecurityHeaders: (req: Request, res: Response, next: NextFunction) => {
        // Add security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        
        // Add cache control for non-static resources
        if (!req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        }
        
        next();
    },

    /**
     * SQL injection protection middleware
     */
    sqlInjectionProtection: (req: Request, res: Response, next: NextFunction) => {
        // Skip SQL injection check for specific test routes
        if (req.path === '/api/test/sanitize') {
            return next();
        }
        
        // Check for SQL injection patterns in query parameters
        const checkSqlInjection = (obj: any): boolean => {
            if (!obj) return false;
            
            const sqlPatterns = [
                /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
                /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
                /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
                /((\%27)|(\'))union/i,
                /exec(\s|\+)+(s|x)p\w+/i,
                /UNION(\s+)ALL(\s+)SELECT/i,
            ];
            
            const checkValue = (value: any): boolean => {
                if (typeof value === 'string') {
                    return sqlPatterns.some(pattern => pattern.test(value));
                } else if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(v => checkValue(v));
                }
                return false;
            };
            
            return checkValue(obj);
        };
        
        // Check request components for SQL injection patterns
        if (
            checkSqlInjection(req.query) || 
            checkSqlInjection(req.params) || 
            checkSqlInjection(req.body)
        ) {
            logSecurityEvent('sql_injection_attempt', 'high', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                userId: req.user?.id,
                query: req.query,
                params: req.params,
            });
            
            return next(ErrorTypes.FORBIDDEN('Invalid input detected'));
        }
        
        next();
    },
};

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    // Handle objects
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Apply appropriate sanitization based on key name
            if (key.toLowerCase().includes('html') || key.toLowerCase().includes('content')) {
                sanitized[key] = xss(value);
            } else if (key.toLowerCase().includes('email')) {
                sanitized[key] = validator.isEmail(value) ? value : '';
            } else if (key.toLowerCase().includes('url')) {
                sanitized[key] = validator.isURL(value) ? value : '';
            } else {
                // Default string sanitization
                sanitized[key] = validator.escape(value);
            }
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Sanitize sensitive data for audit logs
 */
function sanitizeAuditData(data: any): any {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeAuditData(item));
    }
    
    // Handle objects
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
        // Redact sensitive fields
        if (
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('private')
        ) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeAuditData(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Validate Ethereum address
 */
export const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction hash
 */
export const isValidTransactionHash = (hash: string): boolean => {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Validate amount (numeric string with optional decimal)
 */
export const isValidAmount = (amount: string): boolean => {
    return /^[0-9]+(\.[0-9]+)?$/.test(amount);
};

/**
 * Validate chain ID
 */
export const isValidChainId = (chainId: string): boolean => {
    return /^[0-9]+$/.test(chainId);
};

/**
 * Validate UUID
 */
export const isValidUUID = (uuid: string): boolean => {
    return validator.isUUID(uuid);
};