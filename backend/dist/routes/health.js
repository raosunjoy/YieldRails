"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.healthRouter = router;
router.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: environment_1.config.API_VERSION,
            environment: environment_1.config.NODE_ENV,
            uptime: process.uptime(),
            responseTime: 0,
        };
        health.responseTime = Date.now() - startTime;
        res.json(health);
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});
router.get('/detailed', async (req, res) => {
    const startTime = Date.now();
    try {
        const [dbHealth, redisHealth] = await Promise.allSettled([
            database_1.database.healthCheck(),
            redis_1.redis.healthCheck(),
        ]);
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: environment_1.config.API_VERSION,
            environment: environment_1.config.NODE_ENV,
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
        const allDependenciesHealthy = Object.values(health.dependencies)
            .every(dep => dep.status === 'healthy');
        if (!allDependenciesHealthy) {
            health.status = 'degraded';
        }
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        logger_1.logger.error('Detailed health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed',
        });
    }
});
router.get('/ready', async (req, res) => {
    try {
        const [dbReady, redisReady] = await Promise.all([
            database_1.database.healthCheck(),
            redis_1.redis.healthCheck(),
        ]);
        if (dbReady && redisReady) {
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        }
        else {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                dependencies: {
                    database: dbReady,
                    redis: redisReady,
                },
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed',
        });
    }
});
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
//# sourceMappingURL=health.js.map