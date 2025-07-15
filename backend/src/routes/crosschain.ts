import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CrossChainService } from '../services/CrossChainService';
import { authMiddleware } from '../middleware/auth';
import { logger, logApiMetrics } from '../utils/logger';

const router = Router();
const crossChainService = new CrossChainService();

/**
 * Validation middleware for bridge requests
 */
const validateBridgeRequest = [
    body('sourceChain')
        .isString()
        .notEmpty()
        .withMessage('Source chain is required'),
    body('destinationChain')
        .isString()
        .notEmpty()
        .withMessage('Destination chain is required'),
    body('amount')
        .isNumeric()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('sourceAddress')
        .isEthereumAddress()
        .withMessage('Valid source address is required'),
    body('destinationAddress')
        .isEthereumAddress()
        .withMessage('Valid destination address is required'),
    body('paymentId')
        .optional()
        .isString()
        .withMessage('Payment ID must be a string'),
    body('token')
        .optional()
        .isString()
        .withMessage('Token must be a string')
];

/**
 * Validation middleware for transaction ID
 */
const validateTransactionId = [
    param('transactionId')
        .isString()
        .notEmpty()
        .withMessage('Transaction ID is required')
];

/**
 * POST /api/crosschain/bridge
 * Initiate cross-chain bridge transaction
 */
router.post('/bridge', authMiddleware, validateBridgeRequest, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/bridge', 'POST', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        // Initiate bridge transaction using the correct method
        const bridgeTransaction = await crossChainService.initiateBridgeTransaction(
            req.body.sourceChain,
            req.body.destinationChain,
            parseFloat(req.body.amount),
            req.body.token || 'USDC',
            req.body.destinationAddress,
            req.body.sourceAddress,
            req.body.paymentId
        );

        logApiMetrics('/api/crosschain/bridge', 'POST', 201, Date.now() - startTime, req.user?.id);

        res.status(201).json({
            success: true,
            data: {
                transactionId: bridgeTransaction.id,
                status: bridgeTransaction.status,
                sourceChain: bridgeTransaction.sourceChain,
                destinationChain: bridgeTransaction.destinationChain,
                amount: bridgeTransaction.sourceAmount,
                bridgeFee: bridgeTransaction.bridgeFee,
                estimatedTime: crossChainService.estimateBridgeTime(
                    bridgeTransaction.sourceChain,
                    bridgeTransaction.destinationChain
                ),
                createdAt: bridgeTransaction.createdAt
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error initiating bridge transaction:', error);
        logApiMetrics('/api/crosschain/bridge', 'POST', 500, Date.now() - startTime, req.user?.id);

        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to initiate bridge transaction',
            details: err.message
        });
    }
});

/**
 * GET /api/crosschain/transaction/:transactionId
 * Get bridge transaction status
 */
router.get('/transaction/:transactionId', authMiddleware, validateTransactionId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/transaction/:id', 'GET', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { transactionId } = req.params;
        const transaction = await crossChainService.getBridgeTransaction(transactionId);

        if (!transaction) {
            logApiMetrics('/api/crosschain/transaction/:id', 'GET', 404, Date.now() - startTime, req.user?.id);
            return res.status(404).json({
                error: 'Not Found',
                message: 'Bridge transaction not found'
            });
        }

        logApiMetrics('/api/crosschain/transaction/:id', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                transactionId: transaction.id,
                paymentId: transaction.paymentId,
                status: transaction.status,
                sourceChain: transaction.sourceChain,
                destinationChain: transaction.destinationChain,
                sourceAmount: transaction.sourceAmount,
                destinationAmount: transaction.destinationAmount,
                bridgeFee: transaction.bridgeFee,
                sourceTransactionHash: transaction.sourceTransactionHash,
                destTransactionHash: transaction.destTransactionHash,
                bridgeTransactionId: transaction.bridgeTransactionId,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                sourceConfirmedAt: transaction.sourceConfirmedAt,
                destConfirmedAt: transaction.destConfirmedAt
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting bridge transaction ${req.params.transactionId}:`, error);
        logApiMetrics('/api/crosschain/transaction/:id', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get bridge transaction',
            details: err.message
        });
    }
});

/**
 * GET /api/crosschain/supported-chains
 * Get list of supported chains for bridging
 */
router.get('/supported-chains', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const supportedChains = crossChainService.getSupportedChains();

        logApiMetrics('/api/crosschain/supported-chains', 'GET', 200, Date.now() - startTime);

        res.json({
            success: true,
            data: {
                chains: supportedChains,
                count: supportedChains.length
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting supported chains:', error);
        logApiMetrics('/api/crosschain/supported-chains', 'GET', 500, Date.now() - startTime);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get supported chains',
            details: err.message
        });
    }
});

/**
 * POST /api/crosschain/estimate
 * Get bridge fee and time estimate
 */
router.post('/estimate', [
    body('sourceChain').isString().notEmpty(),
    body('destinationChain').isString().notEmpty(),
    body('amount').isNumeric().isFloat({ min: 0.01 })
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/estimate', 'POST', 400, Date.now() - startTime);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { sourceChain, destinationChain, amount } = req.body;

        // Use the CrossChainService getBridgeEstimate method
        const estimate = await crossChainService.getBridgeEstimate(sourceChain, destinationChain, parseFloat(amount));

        logApiMetrics('/api/crosschain/estimate', 'POST', 200, Date.now() - startTime);

        res.json({
            success: true,
            data: {
                sourceChain,
                destinationChain,
                amount: parseFloat(amount),
                estimatedFee: estimate.fee,
                estimatedTime: estimate.estimatedTime,
                estimatedYield: estimate.estimatedYield,
                netAmount: parseFloat(amount) - estimate.fee + estimate.estimatedYield
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error calculating bridge estimate:', error);
        logApiMetrics('/api/crosschain/estimate', 'POST', 500, Date.now() - startTime);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to calculate bridge estimate',
            details: err.message
        });
    }
});

/**
 * POST /api/crosschain/transaction/:transactionId/process
 * Process a bridge transaction through validation and settlement
 */
router.post('/transaction/:transactionId/process', authMiddleware, validateTransactionId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/transaction/:id/process', 'POST', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { transactionId } = req.params;
        await crossChainService.processBridgeTransaction(transactionId);

        logApiMetrics('/api/crosschain/transaction/:id/process', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Bridge transaction processing initiated',
            data: {
                transactionId
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error processing bridge transaction ${req.params.transactionId}:`, error);
        logApiMetrics('/api/crosschain/transaction/:id/process', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process bridge transaction',
            details: err.message
        });
    }
});

/**
 * POST /api/crosschain/transaction/:transactionId/cancel
 * Cancel a bridge transaction (if still pending)
 */
router.post('/transaction/:transactionId/cancel', authMiddleware, validateTransactionId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/transaction/:id/cancel', 'POST', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { transactionId } = req.params;
        const cancelled = await crossChainService.cancelBridgeTransaction(transactionId);

        if (!cancelled) {
            logApiMetrics('/api/crosschain/transaction/:id/cancel', 'POST', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Cannot Cancel',
                message: 'Transaction cannot be cancelled at this stage'
            });
        }

        logApiMetrics('/api/crosschain/transaction/:id/cancel', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Bridge transaction cancelled successfully',
            data: {
                transactionId
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error cancelling bridge transaction ${req.params.transactionId}:`, error);
        logApiMetrics('/api/crosschain/transaction/:id/cancel', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to cancel bridge transaction',
            details: err.message
        });
    }
});

/**
 * POST /api/crosschain/transaction/:transactionId/retry
 * Retry a failed bridge transaction
 */
router.post('/transaction/:transactionId/retry', authMiddleware, validateTransactionId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/transaction/:id/retry', 'POST', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { transactionId } = req.params;
        const retried = await crossChainService.retryBridgeTransaction(transactionId);

        if (!retried) {
            logApiMetrics('/api/crosschain/transaction/:id/retry', 'POST', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Cannot Retry',
                message: 'Transaction cannot be retried'
            });
        }

        logApiMetrics('/api/crosschain/transaction/:id/retry', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Bridge transaction retry initiated',
            data: {
                transactionId
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error retrying bridge transaction ${req.params.transactionId}:`, error);
        logApiMetrics('/api/crosschain/transaction/:id/retry', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retry bridge transaction',
            details: err.message
        });
    }
});

/**
 * GET /api/crosschain/transaction/:transactionId/status
 * Get comprehensive bridge transaction status
 */
router.get('/transaction/:transactionId/status', authMiddleware, validateTransactionId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/transaction/:id/status', 'GET', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { transactionId } = req.params;
        const status = await crossChainService.getBridgeStatus(transactionId);

        if (!status) {
            logApiMetrics('/api/crosschain/transaction/:id/status', 'GET', 404, Date.now() - startTime, req.user?.id);
            return res.status(404).json({
                error: 'Not Found',
                message: 'Bridge transaction not found'
            });
        }

        logApiMetrics('/api/crosschain/transaction/:id/status', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: status
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting bridge transaction status ${req.params.transactionId}:`, error);
        logApiMetrics('/api/crosschain/transaction/:id/status', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get bridge transaction status',
            details: err.message
        });
    }
});

/**
 * GET /api/crosschain/user/:address/transactions
 * Get bridge transactions for a user
 */
router.get('/user/:address/transactions', authMiddleware, [
    param('address').isEthereumAddress().withMessage('Valid address is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/user/:address/transactions', 'GET', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { address } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const transactions = await crossChainService.getUserBridgeTransactions(address, limit, offset);

        logApiMetrics('/api/crosschain/user/:address/transactions', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    limit,
                    offset,
                    count: transactions.length
                }
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting user bridge transactions for ${req.params.address}:`, error);
        logApiMetrics('/api/crosschain/user/:address/transactions', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user bridge transactions',
            details: err.message
        });
    }
});

/**
 * GET /api/crosschain/analytics
 * Get bridge analytics
 */
router.get('/analytics', authMiddleware, [
    query('timeRange').optional().isIn(['day', 'week', 'month']).withMessage('Time range must be day, week, or month')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/analytics', 'GET', 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const timeRange = (req.query.timeRange as 'day' | 'week' | 'month') || 'day';
        const analytics = await crossChainService.getBridgeAnalytics(timeRange);

        logApiMetrics('/api/crosschain/analytics', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting bridge analytics:', error);
        logApiMetrics('/api/crosschain/analytics', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get bridge analytics',
            details: err.message
        });
    }
});

/**
 * GET /api/crosschain/liquidity
 * Get liquidity pool information
 */
router.get('/liquidity', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const liquidityPools = crossChainService.getLiquidityPools();

        logApiMetrics('/api/crosschain/liquidity', 'GET', 200, Date.now() - startTime);

        res.json({
            success: true,
            data: {
                pools: liquidityPools,
                count: liquidityPools.length
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting liquidity pools:', error);
        logApiMetrics('/api/crosschain/liquidity', 'GET', 500, Date.now() - startTime);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get liquidity pools',
            details: err.message
        });
    }
});

/**
 * POST /api/crosschain/liquidity/check
 * Check liquidity availability for a bridge transaction
 */
router.post('/liquidity/check', [
    body('sourceChain').isString().notEmpty(),
    body('destinationChain').isString().notEmpty(),
    body('amount').isNumeric().isFloat({ min: 0.01 }),
    body('token').optional().isString()
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logApiMetrics('/api/crosschain/liquidity/check', 'POST', 400, Date.now() - startTime);
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { sourceChain, destinationChain, amount, token } = req.body;
        const liquidityCheck = await crossChainService.checkLiquidityAvailability(
            sourceChain,
            destinationChain,
            parseFloat(amount),
            token || 'USDC'
        );

        logApiMetrics('/api/crosschain/liquidity/check', 'POST', 200, Date.now() - startTime);

        res.json({
            success: true,
            data: liquidityCheck
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error checking liquidity availability:', error);
        logApiMetrics('/api/crosschain/liquidity/check', 'POST', 500, Date.now() - startTime);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check liquidity availability',
            details: err.message
        });
    }
});

export { router as crossChainRouter };