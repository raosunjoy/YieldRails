"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBusinessEvent = exports.logApiMetrics = exports.logSecurityEvent = exports.logBlockchainOperation = exports.logPerformance = exports.logError = exports.requestLogger = exports.createChildLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const environment_1 = require("../config/environment");
const loggerConfig = {
    level: environment_1.config.LOG_LEVEL,
    formatters: {
        level: (label) => {
            return { level: label };
        },
        log: (object) => {
            const { req, res, ...rest } = object;
            return rest;
        },
    },
    serializers: {
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
        err: pino_1.default.stdSerializers.err,
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    base: {
        service: 'yieldrails-api',
        version: environment_1.config.API_VERSION,
        environment: environment_1.config.NODE_ENV,
    },
};
if (environment_1.isDevelopment) {
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
if (environment_1.isProduction) {
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
exports.logger = (0, pino_1.default)(loggerConfig);
const createChildLogger = (context) => {
    return exports.logger.child(context);
};
exports.createChildLogger = createChildLogger;
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    req.id = req.id || Math.random().toString(36).substr(2, 9);
    req.logger = exports.logger.child({
        requestId: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
    });
    req.logger.info({
        msg: 'Request started',
        headers: req.headers,
        query: req.query,
        body: req.body,
    });
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
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
exports.requestLogger = requestLogger;
const logError = (error, context) => {
    exports.logger.error({
        err: error,
        ...context,
        msg: 'Error occurred',
        stack: error.stack,
    });
};
exports.logError = logError;
const logPerformance = (operation, duration, metadata) => {
    exports.logger.info({
        msg: 'Performance metric',
        operation,
        duration,
        ...metadata,
    });
};
exports.logPerformance = logPerformance;
const logBlockchainOperation = (operation, chainId, txHash, gasUsed, metadata) => {
    exports.logger.info({
        msg: 'Blockchain operation',
        operation,
        chainId,
        txHash,
        gasUsed,
        ...metadata,
    });
};
exports.logBlockchainOperation = logBlockchainOperation;
const logSecurityEvent = (event, severity, details) => {
    exports.logger.warn({
        msg: 'Security event',
        event,
        severity,
        ...details,
    });
};
exports.logSecurityEvent = logSecurityEvent;
const logApiMetrics = (endpoint, method, statusCode, duration, userId) => {
    exports.logger.info({
        msg: 'API metrics',
        endpoint,
        method,
        statusCode,
        duration,
        userId,
    });
};
exports.logApiMetrics = logApiMetrics;
const logBusinessEvent = (event, userId, metadata) => {
    exports.logger.info({
        msg: 'Business event',
        event,
        userId,
        ...metadata,
    });
};
exports.logBusinessEvent = logBusinessEvent;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map