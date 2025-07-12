"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEthereumSignature = exports.generateToken = exports.optionalAuth = exports.requireRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("./errorHandler");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw errorHandler_1.ErrorTypes.UNAUTHORIZED('Authentication token required');
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.JWT_SECRET);
        req.user = {
            id: decoded.sub,
            address: decoded.address,
            role: decoded.role || 'user',
            email: decoded.email,
            isVerified: decoded.isVerified || false,
        };
        logger_1.logger.debug('User authenticated successfully', {
            userId: req.user.id,
            address: req.user.address,
            role: req.user.role,
        });
        next();
    }
    catch (error) {
        const err = error;
        if (err.name === 'TokenExpiredError') {
            (0, logger_1.logSecurityEvent)('token_expired', 'low', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            throw errorHandler_1.ErrorTypes.UNAUTHORIZED('Authentication token has expired');
        }
        if (err.name === 'JsonWebTokenError') {
            (0, logger_1.logSecurityEvent)('invalid_token', 'medium', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            throw errorHandler_1.ErrorTypes.UNAUTHORIZED('Invalid authentication token');
        }
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw errorHandler_1.ErrorTypes.UNAUTHORIZED('Authentication required');
        }
        if (!allowedRoles.includes(req.user.role)) {
            (0, logger_1.logSecurityEvent)('unauthorized_access_attempt', 'high', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                endpoint: req.path,
                ip: req.ip,
            });
            throw errorHandler_1.ErrorTypes.FORBIDDEN('Insufficient permissions');
        }
        next();
    };
};
exports.requireRole = requireRole;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.JWT_SECRET);
            req.user = {
                id: decoded.sub,
                address: decoded.address,
                role: decoded.role || 'user',
                email: decoded.email,
                isVerified: decoded.isVerified || false,
            };
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const generateToken = (user) => {
    const payload = {
        sub: user.id,
        address: user.address,
        role: user.role,
        email: user.email,
        isVerified: user.isVerified,
    };
    const options = {
        expiresIn: environment_1.config.JWT_EXPIRES_IN,
        issuer: 'yieldrails-api',
        audience: 'yieldrails-client',
    };
    return jsonwebtoken_1.default.sign(payload, environment_1.config.JWT_SECRET, options);
};
exports.generateToken = generateToken;
const verifyEthereumSignature = (address, message, signature) => {
    try {
        return true;
    }
    catch (error) {
        logger_1.logger.error('Ethereum signature verification failed:', error);
        return false;
    }
};
exports.verifyEthereumSignature = verifyEthereumSignature;
//# sourceMappingURL=auth.js.map