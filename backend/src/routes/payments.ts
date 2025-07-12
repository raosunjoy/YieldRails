import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PaymentService, CreatePaymentRequest, PaymentStatus } from '../services/PaymentService';
import { logger, logApiMetrics } from '../utils/logger';
import { chainConfigs, supportedTokens } from '../config/environment';

const router = Router();
const paymentService = new PaymentService();

/**
 * Validation middleware
 */
const validatePaymentCreation = [
    body('merchantAddress')
        .isEthereumAddress()
        .withMessage('Invalid merchant address'),
    body('amount')
        .isDecimal({ decimal_digits: '0,18' })
        .withMessage('Invalid amount format')
        .custom((value) => {
            const amount = parseFloat(value);
            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }
            return true;
        }),
    body('token')
        .isIn(Object.keys(supportedTokens))
        .withMessage('Unsupported token'),
    body('chain')
        .isIn(Object.keys(chainConfigs))
        .withMessage('Unsupported chain'),
    body('customerEmail')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
    body('yieldEnabled')
        .optional()
        .isBoolean()
        .withMessage('yieldEnabled must be boolean'),
    body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiration date format')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Expiration date must be in the future');
            }
            return true;
        }),
    body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];

const validatePaymentId = [
    param('paymentId')
        .matches(/^pay_[0-9]+_[a-z0-9]+$/)
        .withMessage('Invalid payment ID format'),
];

const validateMerchantAddress = [
    param('merchantAddress')
        .isEthereumAddress()
        .withMessage('Invalid merchant address'),
];

const validatePagination = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be non-negative'),
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
 * CREATE /api/payments
 * Create a new payment
 */
router.post('/', validatePaymentCreation, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const createRequest: CreatePaymentRequest = {
            merchantAddress: req.body.merchantAddress,
            amount: req.body.amount,
            token: req.body.token,
            chain: req.body.chain,
            customerEmail: req.body.customerEmail,
            metadata: req.body.metadata,
            yieldEnabled: req.body.yieldEnabled || false,
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        };

        const payment = await paymentService.createPayment(createRequest, req.user?.id);

        logApiMetrics('/api/payments', 'POST', 201, Date.now() - startTime, req.user?.id);

        res.status(201).json({
            success: true,
            data: {
                paymentId: payment.id,
                merchantAddress: payment.merchantAddress,
                amount: payment.amount,
                token: payment.token,
                chain: payment.chain,
                status: payment.status,
                escrowAddress: payment.escrowAddress,
                yieldEnabled: payment.yieldEnabled,
                expiresAt: payment.expiresAt,
                createdAt: payment.createdAt,
                metadata: payment.metadata,
            },
        });

    } catch (error) {
        logger.error('Error creating payment:', error);
        logApiMetrics('/api/payments', 'POST', 500, Date.now() - startTime, req.user?.id);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create payment',
        });
    }
});

/**
 * GET /api/payments/:paymentId
 * Get payment details
 */
router.get('/:paymentId', validatePaymentId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        const payment = await paymentService.getPayment(paymentId);

        if (!payment) {
            logApiMetrics('/api/payments/:id', 'GET', 404, Date.now() - startTime, req.user?.id);
            return res.status(404).json({
                error: 'Not Found',
                message: `Payment ${paymentId} not found`,
            });
        }

        logApiMetrics('/api/payments/:id', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                paymentId: payment.id,
                merchantAddress: payment.merchantAddress,
                customerAddress: payment.customerAddress,
                amount: payment.amount,
                token: payment.token,
                chain: payment.chain,
                status: payment.status,
                transactionHash: payment.transactionHash,
                escrowAddress: payment.escrowAddress,
                yieldEnabled: payment.yieldEnabled,
                yieldEarned: payment.yieldEarned,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                expiresAt: payment.expiresAt,
                metadata: payment.metadata,
            },
        });

    } catch (error) {
        logger.error(`Error getting payment ${req.params.paymentId}:`, error);
        logApiMetrics('/api/payments/:id', 'GET', 500, Date.now() - startTime, req.user?.id);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve payment',
        });
    }
});

/**
 * POST /api/payments/:paymentId/confirm
 * Confirm payment by depositing funds
 */
router.post('/:paymentId/confirm', validatePaymentId, [
    body('customerAddress')
        .isEthereumAddress()
        .withMessage('Invalid customer address'),
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        const { customerAddress } = req.body;

        const payment = await paymentService.confirmPayment(paymentId, customerAddress);

        logApiMetrics('/api/payments/:id/confirm', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Payment confirmed successfully',
            data: {
                paymentId: payment.id,
                status: payment.status,
                transactionHash: payment.transactionHash,
                customerAddress: payment.customerAddress,
                yieldEnabled: payment.yieldEnabled,
            },
        });

    } catch (error) {
        logger.error(`Error confirming payment ${req.params.paymentId}:`, error);
        logApiMetrics('/api/payments/:id/confirm', 'POST', 500, Date.now() - startTime, req.user?.id);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'Failed to confirm payment',
        });
    }
});

/**
 * POST /api/payments/:paymentId/release
 * Release payment to merchant
 */
router.post('/:paymentId/release', validatePaymentId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { paymentId } = req.params;
        const merchantId = req.user?.address; // From auth middleware

        if (!merchantId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Merchant authentication required',
            });
        }

        const payment = await paymentService.releasePayment(paymentId, merchantId);

        logApiMetrics('/api/payments/:id/release', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'Payment released successfully',
            data: {
                paymentId: payment.id,
                status: payment.status,
                transactionHash: payment.transactionHash,
                yieldEarned: payment.yieldEarned,
                completedAt: payment.updatedAt,
            },
        });

    } catch (error) {
        logger.error(`Error releasing payment ${req.params.paymentId}:`, error);
        logApiMetrics('/api/payments/:id/release', 'POST', 500, Date.now() - startTime, req.user?.id);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'Failed to release payment',
        });
    }
});

/**
 * GET /api/payments/merchant/:merchantAddress
 * Get payment history for a merchant
 */
router.get('/merchant/:merchantAddress', 
    validateMerchantAddress, 
    validatePagination, 
    async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { merchantAddress } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Authorization check - merchants can only see their own payments
        if (req.user?.address?.toLowerCase() !== merchantAddress.toLowerCase() && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to merchant payment history',
            });
        }

        const result = await paymentService.getMerchantPayments(merchantAddress, limit, offset);

        logApiMetrics('/api/payments/merchant/:address', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                payments: result.payments.map(payment => ({
                    paymentId: payment.id,
                    customerAddress: payment.customerAddress,
                    amount: payment.amount,
                    token: payment.token,
                    chain: payment.chain,
                    status: payment.status,
                    yieldEnabled: payment.yieldEnabled,
                    yieldEarned: payment.yieldEarned,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                })),
                pagination: {
                    total: result.total,
                    limit,
                    offset,
                    hasMore: offset + limit < result.total,
                },
            },
        });

    } catch (error) {
        logger.error(`Error getting merchant payments for ${req.params.merchantAddress}:`, error);
        logApiMetrics('/api/payments/merchant/:address', 'GET', 500, Date.now() - startTime, req.user?.id);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve payment history',
        });
    }
});

/**
 * GET /api/payments/stats
 * Get payment statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // This would implement payment statistics
        // For now, return mock data
        const stats = {
            totalPayments: 0,
            totalVolume: '0',
            averagePayment: '0',
            yieldGenerated: '0',
            activePayments: 0,
            completedPayments: 0,
        };

        logApiMetrics('/api/payments/stats', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: stats,
        });

    } catch (error) {
        logger.error('Error getting payment stats:', error);
        logApiMetrics('/api/payments/stats', 'GET', 500, Date.now() - startTime, req.user?.id);
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve payment statistics',
        });
    }
});

export { router as paymentsRouter };