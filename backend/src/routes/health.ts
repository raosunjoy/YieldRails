import { Router, Request, Response } from 'express';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: config.API_VERSION,
            environment: config.NODE_ENV,
            uptime: process.uptime(),
            responseTime: 0,
        };

        health.responseTime = Date.now() - startTime;

        res.json(health);

    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});

/**
 * GET /api/health/detailed
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const [dbHealth, redisHealth] = await Promise.allSettled([
            database.healthCheck(),
            redis.healthCheck(),
        ]);

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: config.API_VERSION,
            environment: config.NODE_ENV,
            uptime: process.uptime(),
            responseTime: Date.now() - startTime,
            dependencies: {
                database: {
                    status: dbHealth.status === 'fulfilled' && dbHealth.value ? 'healthy' : 'unhealthy',
                    responseTime: 0,
                },
                redis: {
                    status: redisHealth.status === 'fulfilled' && redisHealth.value ? 'healthy' : 'unhealthy',
                    responseTime: 0,
                },
            },
            system: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
            },
        };

        // Determine overall status
        const allDependenciesHealthy = Object.values(health.dependencies)
            .every(dep => dep.status === 'healthy');

        if (!allDependenciesHealthy) {
            health.status = 'degraded';
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed',
        });
    }
});

/**
 * GET /api/health/ready
 * Readiness probe for container orchestration
 */
router.get('/ready', async (req: Request, res: Response) => {
    try {
        // Check if all critical services are available
        const [dbReady, redisReady] = await Promise.all([
            database.healthCheck(),
            redis.healthCheck(),
        ]);

        if (dbReady && redisReady) {
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                dependencies: {
                    database: dbReady,
                    redis: redisReady,
                },
            });
        }

    } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed',
        });
    }
});

/**
 * GET /api/health/live
 * Liveness probe for container orchestration
 */
router.get('/live', (req: Request, res: Response) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export { router as healthRouter };