import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestValidator, requestIdMiddleware, requestSizeLimiter } from './middleware/requestValidator';
import { authMiddleware } from './middleware/auth';
import { securityMiddleware } from './middleware/security';
import { database } from './config/database';
import { redis } from './config/redis';
import { websocketServer } from './services/websocket';

// Import route handlers
import { paymentsRouter } from './routes/payments';
import { yieldRouter } from './routes/yield';
import { crossChainRouter } from './routes/crosschain';
import { complianceRouter } from './routes/compliance';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';

/**
 * YieldRails Backend API Server
 * Multi-chain payment rails with yield generation
 */
class YieldRailsServer {
    private app: express.Application;
    private server: any;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        // Request ID for tracing
        this.app.use(requestIdMiddleware);
        
        // Enhanced security middleware
        this.app.use(securityMiddleware.enhancedHelmet);
        this.app.use(securityMiddleware.additionalSecurityHeaders);
        
        // CORS configuration with enhanced security
        this.app.use(cors(securityMiddleware.corsOptions));
        
        // Redis-backed rate limiting for better performance and distributed rate limiting
        this.app.use(securityMiddleware.redisRateLimiter);
        
        // Request size limiting to prevent DoS attacks
        this.app.use(requestSizeLimiter(10)); // 10MB limit
        
        // Input sanitization to prevent XSS and injection attacks
        this.app.use(securityMiddleware.inputSanitizer);
        
        // SQL injection protection
        this.app.use(securityMiddleware.sqlInjectionProtection);
        
        // Audit logging for sensitive operations
        this.app.use(securityMiddleware.auditLogger);
        
        // Request parsing and logging
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    }

    private setupRoutes(): void {
        // Health check (no auth required)
        this.app.use('/api/health', healthRouter);

        // Authentication routes
        this.app.use('/api/auth', authRouter);

        // Protected API routes
        this.app.use('/api/payments', authMiddleware, requestValidator, paymentsRouter);
        this.app.use('/api/yield', authMiddleware, requestValidator, yieldRouter);
        this.app.use('/api/crosschain', authMiddleware, requestValidator, crossChainRouter);
        this.app.use('/api/compliance', authMiddleware, requestValidator, complianceRouter);
        this.app.use('/api/admin', authMiddleware, requestValidator, adminRouter);

        // API documentation
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
                    admin: '/api/admin',
                },
                documentation: 'https://docs.yieldrails.com/api',
            });
        });

        // 404 handler with improved security
        this.app.use('*', notFoundHandler);
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);
    }

    public async start(): Promise<void> {
        try {
            // Initialize database connection
            await database.connect();
            logger.info('Database connected successfully');

            // Initialize Redis connection
            await redis.connect();
            logger.info('Redis connected successfully');

            // Start HTTP server
            this.server = this.app.listen(config.PORT, () => {
                logger.info(`YieldRails API server started on port ${config.PORT}`);
                logger.info(`Environment: ${config.NODE_ENV}`);
                logger.info(`API Documentation: http://localhost:${config.PORT}/api`);
            });

            // Start WebSocket server
            websocketServer.init(this.server);
            logger.info('WebSocket server initialized');

            // Graceful shutdown handlers
            process.on('SIGTERM', this.shutdown.bind(this));
            process.on('SIGINT', this.shutdown.bind(this));

        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    private async shutdown(): Promise<void> {
        logger.info('Received shutdown signal, closing server gracefully...');

        if (this.server) {
            this.server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    await database.disconnect();
                    logger.info('Database disconnected');

                    await redis.disconnect();
                    logger.info('Redis disconnected');

                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
        }
    }
}

// Start the server
const server = new YieldRailsServer();
server.start().catch((error) => {
    logger.error('Failed to start YieldRails server:', error);
    process.exit(1);
});

export { YieldRailsServer };