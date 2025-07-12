import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger, logSecurityEvent } from '../utils/logger';
import { ErrorTypes } from './errorHandler';

/**
 * User interface for authenticated requests
 */
export interface AuthenticatedUser {
    id: string;
    address: string;
    role: 'user' | 'merchant' | 'admin';
    email?: string;
    isVerified: boolean;
}

/**
 * Extend Express Request to include user
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
            id?: string;
        }
    }
}

/**
 * JWT authentication middleware
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ErrorTypes.UNAUTHORIZED('Authentication token required');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify JWT token
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;

        // Attach user to request
        req.user = {
            id: decoded.sub,
            address: decoded.address,
            role: decoded.role || 'user',
            email: decoded.email,
            isVerified: decoded.isVerified || false,
        };

        logger.debug('User authenticated successfully', {
            userId: req.user.id,
            address: req.user.address,
            role: req.user.role,
        });

        next();

    } catch (error: unknown) {
        const err = error as Error;
        if (err.name === 'TokenExpiredError') {
            logSecurityEvent('token_expired', 'low', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            throw ErrorTypes.UNAUTHORIZED('Authentication token has expired');
        }

        if (err.name === 'JsonWebTokenError') {
            logSecurityEvent('invalid_token', 'medium', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            throw ErrorTypes.UNAUTHORIZED('Invalid authentication token');
        }

        next(error);
    }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw ErrorTypes.UNAUTHORIZED('Authentication required');
        }

        if (!allowedRoles.includes(req.user.role)) {
            logSecurityEvent('unauthorized_access_attempt', 'high', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                endpoint: req.path,
                ip: req.ip,
            });
            throw ErrorTypes.FORBIDDEN('Insufficient permissions');
        }

        next();
    };
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, config.JWT_SECRET) as any;
            
            req.user = {
                id: decoded.sub,
                address: decoded.address,
                role: decoded.role || 'user',
                email: decoded.email,
                isVerified: decoded.isVerified || false,
            };
        }

        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

/**
 * Generate JWT token
 */
export const generateToken = (user: AuthenticatedUser): string => {
    const payload = {
        sub: user.id,
        address: user.address,
        role: user.role,
        email: user.email,
        isVerified: user.isVerified,
    };
    
    const options: jwt.SignOptions = {
        expiresIn: config.JWT_EXPIRES_IN,
        issuer: 'yieldrails-api',
        audience: 'yieldrails-client',
    };
    
    return jwt.sign(payload, config.JWT_SECRET, options);
};

/**
 * Verify Ethereum signature for wallet authentication
 */
export const verifyEthereumSignature = (address: string, message: string, signature: string): boolean => {
    try {
        // This would implement Ethereum signature verification
        // For now, return true as placeholder
        return true;
    } catch (error) {
        logger.error('Ethereum signature verification failed:', error);
        return false;
    }
};