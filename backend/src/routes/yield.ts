import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { YieldService } from '../services/YieldService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logger, logApiMetrics } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { YieldStrategyType, RiskLevel } from '@prisma/client';

const router = Router();
const yieldService = new YieldService();

/**
 * Validation middleware
 */
const validateUserId = [
    param('userId').isString().notEmpty().withMessage('User ID is required')
];

const validatePaymentId = [
    param('paymentId').isString().notEmpty().withMessage('Payment ID is required')
];

const validateStrategyId = [
    param('strategyId').isString().notEmpty().withMessage('Strategy ID is required')
];

const validateOptimization = [
    body('amount').isNumeric().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('riskTolerance').optional().isIn(['low', 'medium', 'high']).withMessage('Risk tolerance must be low, medium, or high')
];

const validatePagination = [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

/**
 * Helper function to handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation Error',
            details: errors.array(),
        });
    }
    return null;
};

/**
 * GET /api/yield/strategies
 * Get available yield strategies
 */
router.get('/strategies', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const strategies = await yieldService.getAvailableStrategies();

        logApiMetrics('/api/yield/strategies', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                strategies,
                count: strategies.length
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting yield strategies:', error);
        logApiMetrics('/api/yield/strategies', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get yield strategies',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/strategies/:strategyId/apy
 * Get current APY for a specific strategy
 */
router.get('/strategies/:strategyId/apy', validateStrategyId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { strategyId } = req.params;
        const apy = await yieldService.getCurrentAPY(strategyId);

        logApiMetrics('/api/yield/strategies/:id/apy', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                strategyId,
                currentAPY: apy,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting APY for strategy ${req.params.strategyId}:`, error);
        logApiMetrics('/api/yield/strategies/:id/apy', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get strategy APY',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/payment/:paymentId/current
 * Get current yield for a payment
 */
router.get('/payment/:paymentId/current', authMiddleware, validatePaymentId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        const currentYield = await yieldService.calculateCurrentYield(paymentId);

        logApiMetrics('/api/yield/payment/:id/current', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                paymentId,
                currentYield,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting current yield for payment ${req.params.paymentId}:`, error);
        logApiMetrics('/api/yield/payment/:id/current', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get current yield',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/payment/:paymentId/final
 * Calculate final yield for a payment
 */
router.get('/payment/:paymentId/final', authMiddleware, validatePaymentId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        const finalYield = await yieldService.calculateFinalYield(paymentId);

        logApiMetrics('/api/yield/payment/:id/final', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                paymentId,
                finalYield,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error calculating final yield for payment ${req.params.paymentId}:`, error);
        logApiMetrics('/api/yield/payment/:id/final', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to calculate final yield',
            details: err.message
        });
    }
});

/**
 * POST /api/yield/optimize
 * Get yield optimization recommendations
 */
router.post('/optimize', authMiddleware, validateOptimization, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User authentication required'
            });
        }

        const { amount, riskTolerance } = req.body;
        const optimization = await yieldService.optimizeAllocation(userId, parseFloat(amount));

        logApiMetrics('/api/yield/optimize', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                userId,
                amount: parseFloat(amount),
                riskTolerance: riskTolerance || 'medium',
                optimization,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error optimizing yield allocation:', error);
        logApiMetrics('/api/yield/optimize', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to optimize yield allocation',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/user/:userId/history
 * Get yield history for a user
 */
router.get('/user/:userId/history', authMiddleware, validateUserId, validatePagination, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Authorization check - users can only see their own history
        if (req.user?.id !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to user yield history'
            });
        }

        const history = await yieldService.getYieldHistory(userId, limit, offset);

        logApiMetrics('/api/yield/user/:id/history', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                userId,
                history: history.earnings,
                analytics: history.analytics,
                pagination: {
                    limit,
                    offset,
                    total: history.total
                }
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting yield history for user ${req.params.userId}:`, error);
        logApiMetrics('/api/yield/user/:id/history', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get yield history',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/user/:userId/performance
 * Get yield performance metrics for a user
 */
router.get('/user/:userId/performance', authMiddleware, validateUserId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId } = req.params;

        // Authorization check
        if (req.user?.id !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to user performance data'
            });
        }

        const performance = await yieldService.getUserPerformance(userId);

        logApiMetrics('/api/yield/user/:id/performance', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                userId,
                performance,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting yield performance for user ${req.params.userId}:`, error);
        logApiMetrics('/api/yield/user/:id/performance', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get yield performance',
            details: err.message
        });
    }
});

/**
 * POST /api/yield/payment/:paymentId/start
 * Start yield generation for a payment
 */
router.post('/payment/:paymentId/start', authMiddleware, validatePaymentId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        await yieldService.startYieldGeneration(paymentId, req.body);

        logApiMetrics('/api/yield/payment/:id/start', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Yield generation started successfully',
            data: {
                paymentId,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error starting yield generation for payment ${req.params.paymentId}:`, error);
        logApiMetrics('/api/yield/payment/:id/start', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to start yield generation',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/analytics
 * Get overall yield analytics
 */
router.get('/analytics', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const analytics = await yieldService.getOverallAnalytics();

        logApiMetrics('/api/yield/analytics', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting yield analytics:', error);
        logApiMetrics('/api/yield/analytics', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get yield analytics',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/strategies/comparison
 * Get strategy performance comparison
 */
router.get('/strategies/comparison', authMiddleware, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const comparison = await yieldService.getStrategyComparison();

        logApiMetrics('/api/yield/strategies/comparison', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: comparison
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting strategy comparison:', error);
        logApiMetrics('/api/yield/strategies/comparison', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get strategy comparison',
            details: err.message
        });
    }
});

/**
 * GET /api/yield/strategies/:strategyId/performance
 * Get historical performance for a strategy
 */
router.get('/strategies/:strategyId/performance', validateStrategyId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { strategyId } = req.params;
        const performance = await yieldService.getStrategyHistoricalPerformance(strategyId);

        logApiMetrics('/api/yield/strategies/:id/performance', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                strategyId,
                performance,
                timestamp: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting performance for strategy ${req.params.strategyId}:`, error);
        logApiMetrics('/api/yield/strategies/:id/performance', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get strategy performance',
            details: err.message
        });
    }
});

/**
 * POST /api/yield/strategies
 * Create a new yield strategy (admin only)
 */
router.post('/strategies', 
    authMiddleware, 
    requireRole(['admin']), 
    [
        body('name').isString().notEmpty().withMessage('Strategy name is required'),
        body('protocolName').isString().notEmpty().withMessage('Protocol name is required'),
        body('chainId').isString().notEmpty().withMessage('Chain ID is required'),
        body('contractAddress').isString().notEmpty().withMessage('Contract address is required'),
        body('strategyType').isIn(Object.values(YieldStrategyType)).withMessage('Valid strategy type is required'),
        body('expectedAPY').isFloat({ min: 0, max: 100 }).withMessage('Expected APY must be between 0 and 100'),
        body('riskLevel').isIn(Object.values(RiskLevel)).withMessage('Valid risk level is required'),
        body('minAmount').isFloat({ min: 0 }).withMessage('Minimum amount must be positive'),
        body('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be positive')
    ],
    asyncHandler(async (req: Request, res: Response) => {
        const startTime = Date.now();
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const strategy = await yieldService.createStrategy(req.body);

        logApiMetrics('/api/yield/strategies', 'POST', 201, Date.now() - startTime, req.user?.id);

        res.status(201).json({
            success: true,
            message: 'Yield strategy created successfully',
            data: strategy
        });
    })
);

/**
 * PUT /api/yield/strategies/:strategyId
 * Update a yield strategy (admin only)
 */
router.put('/strategies/:strategyId', 
    authMiddleware, 
    requireRole(['admin']), 
    validateStrategyId,
    [
        body('description').optional().isString(),
        body('expectedAPY').optional().isFloat({ min: 0, max: 100 }).withMessage('Expected APY must be between 0 and 100'),
        body('riskLevel').optional().isIn(Object.values(RiskLevel)).withMessage('Valid risk level is required'),
        body('minAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be positive'),
        body('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be positive'),
        body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
    ],
    asyncHandler(async (req: Request, res: Response) => {
        const startTime = Date.now();
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { strategyId } = req.params;
        const strategy = await yieldService.updateStrategy(strategyId, req.body);

        logApiMetrics('/api/yield/strategies/:id', 'PUT', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Yield strategy updated successfully',
            data: strategy
        });
    })
);

/**
 * GET /api/yield/payment/:paymentId/distribution
 * Get yield distribution details for a payment
 */
router.get('/payment/:paymentId/distribution', 
    authMiddleware, 
    validatePaymentId,
    asyncHandler(async (req: Request, res: Response) => {
        const startTime = Date.now();
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        const distribution = await yieldService.getYieldDistribution(paymentId);

        logApiMetrics('/api/yield/payment/:id/distribution', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: distribution
        });
    })
);

export { router as yieldRouter };