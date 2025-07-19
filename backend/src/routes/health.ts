import { Router, Request, Response } from 'express';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { CircleCCTPService } from '../services/external/CircleCCTPService';
import { NobleProtocolService } from '../services/external/NobleProtocolService';
import { ResolvProtocolService } from '../services/external/ResolvProtocolService';
import { AaveProtocolService } from '../services/external/AaveProtocolService';

const router = Router();

// Initialize external service instances
const circleCCTPService = new CircleCCTPService();
const nobleProtocolService = new NobleProtocolService();
const resolvProtocolService = new ResolvProtocolService();
const aaveProtocolService = new AaveProtocolService();

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
        const [dbHealth, redisHealth, circleHealth, nobleHealth, resolvHealth, aaveHealth] = await Promise.allSettled([
            database.healthCheck(),
            redis.healthCheck(),
            circleCCTPService.healthCheck(),
            nobleProtocolService.healthCheck(),
            resolvProtocolService.healthCheck(),
            aaveProtocolService.healthCheck(),
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
                circleCCTP: {
                    status: circleHealth.status === 'fulfilled' && circleHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: circleHealth.status === 'fulfilled' ? circleHealth.value?.latency || 0 : 0,
                    error: circleHealth.status === 'rejected' ? circleHealth.reason : undefined,
                },
                noble: {
                    status: nobleHealth.status === 'fulfilled' && nobleHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: nobleHealth.status === 'fulfilled' ? nobleHealth.value?.latency || 0 : 0,
                    error: nobleHealth.status === 'rejected' ? nobleHealth.reason : undefined,
                },
                resolv: {
                    status: resolvHealth.status === 'fulfilled' && resolvHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: resolvHealth.status === 'fulfilled' ? resolvHealth.value?.latency || 0 : 0,
                    error: resolvHealth.status === 'rejected' ? resolvHealth.reason : undefined,
                },
                aave: {
                    status: aaveHealth.status === 'fulfilled' && aaveHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: aaveHealth.status === 'fulfilled' ? aaveHealth.value?.latency || 0 : 0,
                    error: aaveHealth.status === 'rejected' ? aaveHealth.reason : undefined,
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
        const coreDependenciesHealthy = health.dependencies.database.status === 'healthy' && 
                                       health.dependencies.redis.status === 'healthy';
        const externalServicesHealthy = Object.entries(health.dependencies)
            .filter(([key]) => !['database', 'redis'].includes(key))
            .every(([, dep]) => dep.status === 'healthy');

        if (!coreDependenciesHealthy) {
            health.status = 'unhealthy';
        } else if (!externalServicesHealthy) {
            health.status = 'degraded';
        }

        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
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

/**
 * GET /api/health/external
 * External services health check endpoint
 */
router.get('/external', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const [circleHealth, nobleHealth, resolvHealth, aaveHealth] = await Promise.allSettled([
            circleCCTPService.healthCheck(),
            nobleProtocolService.healthCheck(),
            resolvProtocolService.healthCheck(),
            aaveProtocolService.healthCheck(),
        ]);

        const externalServices = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            services: {
                circleCCTP: {
                    status: circleHealth.status === 'fulfilled' && circleHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: circleHealth.status === 'fulfilled' ? circleHealth.value?.latency || 0 : 0,
                    error: circleHealth.status === 'rejected' ? circleHealth.reason?.message || 'Unknown error' : 
                           circleHealth.value?.error || undefined,
                    lastChecked: new Date().toISOString(),
                },
                noble: {
                    status: nobleHealth.status === 'fulfilled' && nobleHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: nobleHealth.status === 'fulfilled' ? nobleHealth.value?.latency || 0 : 0,
                    error: nobleHealth.status === 'rejected' ? nobleHealth.reason?.message || 'Unknown error' : 
                           nobleHealth.value?.error || undefined,
                    lastChecked: new Date().toISOString(),
                },
                resolv: {
                    status: resolvHealth.status === 'fulfilled' && resolvHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: resolvHealth.status === 'fulfilled' ? resolvHealth.value?.latency || 0 : 0,
                    error: resolvHealth.status === 'rejected' ? resolvHealth.reason?.message || 'Unknown error' : 
                           resolvHealth.value?.error || undefined,
                    lastChecked: new Date().toISOString(),
                },
                aave: {
                    status: aaveHealth.status === 'fulfilled' && aaveHealth.value?.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: aaveHealth.status === 'fulfilled' ? aaveHealth.value?.latency || 0 : 0,
                    error: aaveHealth.status === 'rejected' ? aaveHealth.reason?.message || 'Unknown error' : 
                           aaveHealth.value?.error || undefined,
                    lastChecked: new Date().toISOString(),
                },
            },
        };

        // Determine overall external services status
        const allServicesHealthy = Object.values(externalServices.services)
            .every(service => service.status === 'healthy');

        externalServices.status = allServicesHealthy ? 'healthy' : 'degraded';

        const statusCode = externalServices.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(externalServices);

    } catch (error) {
        logger.error('External services health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'External services health check failed',
        });
    }
});

export { router as healthRouter };