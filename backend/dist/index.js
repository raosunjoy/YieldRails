"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YieldRailsServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const environment_1 = require("./config/environment");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const requestValidator_1 = require("./middleware/requestValidator");
const auth_1 = require("./middleware/auth");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const websocket_1 = require("./services/websocket");
const payments_1 = require("./routes/payments");
const yield_1 = require("./routes/yield");
const crosschain_1 = require("./routes/crosschain");
const compliance_1 = require("./routes/compliance");
const health_1 = require("./routes/health");
const auth_2 = require("./routes/auth");
class YieldRailsServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));
        this.app.use((0, cors_1.default)({
            origin: environment_1.config.ALLOWED_ORIGINS.split(','),
            credentials: true,
        }));
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000,
            max: environment_1.config.RATE_LIMIT_MAX,
            message: 'Too many requests from this IP',
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use(limiter);
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_1.logger.info(message.trim()) } }));
    }
    setupRoutes() {
        this.app.use('/api/health', health_1.healthRouter);
        this.app.use('/api/auth', auth_2.authRouter);
        this.app.use('/api/payments', auth_1.authMiddleware, requestValidator_1.requestValidator, payments_1.paymentsRouter);
        this.app.use('/api/yield', auth_1.authMiddleware, requestValidator_1.requestValidator, yield_1.yieldRouter);
        this.app.use('/api/crosschain', auth_1.authMiddleware, requestValidator_1.requestValidator, crosschain_1.crossChainRouter);
        this.app.use('/api/compliance', auth_1.authMiddleware, requestValidator_1.requestValidator, compliance_1.complianceRouter);
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'YieldRails API',
                version: '1.0.0',
                description: 'Yield-powered stablecoin payment rails',
                endpoints: {
                    health: '/api/health',
                    auth: '/api/auth',
                    payments: '/api/payments',
                    yield: '/api/yield',
                    crosschain: '/api/crosschain',
                    compliance: '/api/compliance',
                },
                documentation: 'https://docs.yieldrails.com/api',
            });
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
    }
    async start() {
        try {
            await database_1.database.connect();
            logger_1.logger.info('Database connected successfully');
            await redis_1.redis.connect();
            logger_1.logger.info('Redis connected successfully');
            this.server = this.app.listen(environment_1.config.PORT, () => {
                logger_1.logger.info(`YieldRails API server started on port ${environment_1.config.PORT}`);
                logger_1.logger.info(`Environment: ${environment_1.config.NODE_ENV}`);
                logger_1.logger.info(`API Documentation: http://localhost:${environment_1.config.PORT}/api`);
            });
            websocket_1.websocketServer.init(this.server);
            logger_1.logger.info('WebSocket server initialized');
            process.on('SIGTERM', this.shutdown.bind(this));
            process.on('SIGINT', this.shutdown.bind(this));
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        logger_1.logger.info('Received shutdown signal, closing server gracefully...');
        if (this.server) {
            this.server.close(async () => {
                logger_1.logger.info('HTTP server closed');
                try {
                    await database_1.database.disconnect();
                    logger_1.logger.info('Database disconnected');
                    await redis_1.redis.disconnect();
                    logger_1.logger.info('Redis disconnected');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
        }
    }
}
exports.YieldRailsServer = YieldRailsServer;
const server = new YieldRailsServer();
server.start().catch((error) => {
    logger_1.logger.error('Failed to start YieldRails server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map