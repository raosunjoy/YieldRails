import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { CrossChainService, BridgeRequest } from '../services/CrossChainService';
import { authMiddleware } from '../middleware/auth';
import { logger, logApiMetrics } from '../utils/logger';
import { ErrorTypes } from '../utils/errors';

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

        const bridgeRequest: BridgeRequest = {
            paymentId: req.body.paymentId,
            sourceChain: req.body.sourceChain,
            destinationChain: req.body.destinationChain,
            amount: parseFloat(req.body.amount),
            sourceAddress: req.body.sourceAddress,
            destinationAddress: req.body.destinationAddress,
            token: req.body.token
        };

        // Initiate bridge transaction
        const bridgeTransaction = await crossChainService.initiateBridge(bridgeRequest);

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

        // Calculate estimates (these would be implemented in CrossChainService)
        const estimatedTime = crossChainService.estimateBridgeTime(sourceChain, destinationChain);
        
        // For now, we'll calculate fee directly here
        // In production, this would be a method in CrossChainService
        const feePercentage = 0.001; // 0.1%
        const estimatedFee = parseFloat(amount) * feePercentage;
        const estimatedYield = parseFloat(amount) * 0.05 * (estimatedTime / (1000 * 60 * 60 * 24 * 365)); // 5% APY

        logApiMetrics('/api/crosschain/estimate', 'POST', 200, Date.now() - startTime);

        res.json({
            success: true,
            data: {
                sourceChain,
                destinationChain,
                amount: parseFloat(amount),
                estimatedFee,
                estimatedTime,
                estimatedYield,
                netAmount: parseFloat(amount) - estimatedFee + estimatedYield
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

export { router as crossChainRouter };