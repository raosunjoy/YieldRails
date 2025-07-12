"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const PaymentService_1 = require("../services/PaymentService");
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
exports.paymentsRouter = router;
const paymentService = new PaymentService_1.PaymentService();
const validatePaymentCreation = [
    (0, express_validator_1.body)('merchantAddress')
        .isEthereumAddress()
        .withMessage('Invalid merchant address'),
    (0, express_validator_1.body)('amount')
        .isDecimal({ decimal_digits: '0,18' })
        .withMessage('Invalid amount format')
        .custom((value) => {
        const amount = parseFloat(value);
        if (amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }
        return true;
    }),
    (0, express_validator_1.body)('token')
        .isIn(Object.keys(environment_1.supportedTokens))
        .withMessage('Unsupported token'),
    (0, express_validator_1.body)('chain')
        .isIn(Object.keys(environment_1.chainConfigs))
        .withMessage('Unsupported chain'),
    (0, express_validator_1.body)('customerEmail')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
    (0, express_validator_1.body)('yieldEnabled')
        .optional()
        .isBoolean()
        .withMessage('yieldEnabled must be boolean'),
    (0, express_validator_1.body)('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiration date format')
        .custom((value) => {
        if (new Date(value) <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }
        return true;
    }),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];
const validatePaymentId = [
    (0, express_validator_1.param)('paymentId')
        .matches(/^pay_[0-9]+_[a-z0-9]+$/)
        .withMessage('Invalid payment ID format'),
];
const validateMerchantAddress = [
    (0, express_validator_1.param)('merchantAddress')
        .isEthereumAddress()
        .withMessage('Invalid merchant address'),
];
const validatePagination = [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be non-negative'),
];
const handleValidationErrors = (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation Error',
            details: errors.array(),
        });
    }
    return null;
};
router.post('/', validatePaymentCreation, async (req, res) => {
    const startTime = Date.now();
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError)
            return;
        const createRequest = {
            merchantAddress: req.body.merchantAddress,
            amount: req.body.amount,
            token: req.body.token,
            chain: req.body.chain,
            customerEmail: req.body.customerEmail,
            metadata: req.body.metadata,
            yieldEnabled: req.body.yieldEnabled || false,
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        };
        const userId = req.user?.id;
        if (!userId) {
            throw errors_1.ErrorTypes.UNAUTHORIZED('User ID is required');
        }
        const payment = await paymentService.createPayment(createRequest, userId);
        (0, logger_1.logApiMetrics)('/api/payments', 'POST', 201, Date.now() - startTime, req.user?.id);
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
    }
    catch (error) {
        logger_1.logger.error('Error creating payment:', error);
        (0, logger_1.logApiMetrics)('/api/payments', 'POST', 500, Date.now() - startTime, req.user?.id);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create payment',
        });
    }
});
router.get('/:paymentId', validatePaymentId, async (req, res) => {
    const startTime = Date.now();
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError)
            return;
        const { paymentId } = req.params;
        const payment = await paymentService.getPayment(paymentId);
        if (!payment) {
            (0, logger_1.logApiMetrics)('/api/payments/:id', 'GET', 404, Date.now() - startTime, req.user?.id);
            return res.status(404).json({
                error: 'Not Found',
                message: `Payment ${paymentId} not found`,
            });
        }
        (0, logger_1.logApiMetrics)('/api/payments/:id', 'GET', 200, Date.now() - startTime, req.user?.id);
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
    }
    catch (error) {
        logger_1.logger.error(`Error getting payment ${req.params.paymentId}:`, error);
        (0, logger_1.logApiMetrics)('/api/payments/:id', 'GET', 500, Date.now() - startTime, req.user?.id);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve payment',
        });
    }
});
router.post('/:paymentId/confirm', validatePaymentId, [
    (0, express_validator_1.body)('customerAddress')
        .isEthereumAddress()
        .withMessage('Invalid customer address'),
], async (req, res) => {
    const startTime = Date.now();
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError)
            return;
        const { paymentId } = req.params;
        const { customerAddress } = req.body;
        const payment = await paymentService.confirmPayment(paymentId, customerAddress);
        (0, logger_1.logApiMetrics)('/api/payments/:id/confirm', 'POST', 200, Date.now() - startTime, req.user?.id);
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
    }
    catch (error) {
        const err = error;
        logger_1.logger.error(`Error confirming payment ${req.params.paymentId}:`, error);
        (0, logger_1.logApiMetrics)('/api/payments/:id/confirm', 'POST', 500, Date.now() - startTime, req.user?.id);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message || 'Failed to confirm payment',
        });
    }
});
router.post('/:paymentId/release', validatePaymentId, async (req, res) => {
    const startTime = Date.now();
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError)
            return;
        const { paymentId } = req.params;
        const merchantId = req.user?.address;
        if (!merchantId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Merchant authentication required',
            });
        }
        const payment = await paymentService.releasePayment(paymentId);
        (0, logger_1.logApiMetrics)('/api/payments/:id/release', 'POST', 200, Date.now() - startTime, req.user?.id);
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
    }
    catch (error) {
        const err = error;
        logger_1.logger.error(`Error releasing payment ${req.params.paymentId}:`, error);
        (0, logger_1.logApiMetrics)('/api/payments/:id/release', 'POST', 500, Date.now() - startTime, req.user?.id);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message || 'Failed to release payment',
        });
    }
});
router.get('/merchant/:merchantAddress', validateMerchantAddress, validatePagination, async (req, res) => {
    const startTime = Date.now();
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError)
            return;
        const { merchantAddress } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        if (req.user?.address?.toLowerCase() !== merchantAddress.toLowerCase() && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to merchant payment history',
            });
        }
        const result = await paymentService.getMerchantPayments(merchantAddress, limit, offset);
        (0, logger_1.logApiMetrics)('/api/payments/merchant/:address', 'GET', 200, Date.now() - startTime, req.user?.id);
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
    }
    catch (error) {
        logger_1.logger.error(`Error getting merchant payments for ${req.params.merchantAddress}:`, error);
        (0, logger_1.logApiMetrics)('/api/payments/merchant/:address', 'GET', 500, Date.now() - startTime, req.user?.id);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve payment history',
        });
    }
});
router.get('/stats', async (req, res) => {
    const startTime = Date.now();
    try {
        const stats = {
            totalPayments: 0,
            totalVolume: '0',
            averagePayment: '0',
            yieldGenerated: '0',
            activePayments: 0,
            completedPayments: 0,
        };
        (0, logger_1.logApiMetrics)('/api/payments/stats', 'GET', 200, Date.now() - startTime, req.user?.id);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting payment stats:', error);
        (0, logger_1.logApiMetrics)('/api/payments/stats', 'GET', 500, Date.now() - startTime, req.user?.id);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve payment statistics',
        });
    }
});
//# sourceMappingURL=payments.js.map