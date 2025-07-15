import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ComplianceService } from '../services/ComplianceService';
import { authMiddleware } from '../middleware/auth';
import { logger, logApiMetrics } from '../utils/logger';

const router = Router();
const complianceService = new ComplianceService();

/**
 * Validation middleware
 */
const validateAddress = [
    body('address').isEthereumAddress().withMessage('Valid Ethereum address is required')
];

const validateAddressParam = [
    param('address').isEthereumAddress().withMessage('Valid Ethereum address is required')
];

const validateKYCSubmission = [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('documentType').isIn(['passport', 'drivers_license', 'national_id']).withMessage('Valid document type is required'),
    body('documentNumber').isString().notEmpty().withMessage('Document number is required'),
    body('firstName').isString().notEmpty().withMessage('First name is required'),
    body('lastName').isString().notEmpty().withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('address').isString().notEmpty().withMessage('Address is required'),
    body('documentUrl').optional().isURL().withMessage('Valid document URL required')
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
 * POST /api/compliance/check-address
 * Check address compliance status
 */
router.post('/check-address', validateAddress, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { address } = req.body;
        
        // Simulate compliance check
        const complianceResult = {
            address,
            isCompliant: true,
            riskLevel: 'low',
            sanctions: false,
            pep: false,
            amlFlags: [],
            lastChecked: new Date(),
            source: 'chainalysis'
        };

        logApiMetrics('/api/compliance/check-address', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: complianceResult
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error checking address compliance:', error);
        logApiMetrics('/api/compliance/check-address', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check address compliance',
            details: err.message
        });
    }
});

/**
 * GET /api/compliance/status/:address
 * Get compliance status for an address
 */
router.get('/status/:address', validateAddressParam, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { address } = req.params;
        
        // Simulate getting compliance status
        const status = {
            address,
            status: 'approved',
            riskScore: 15,
            lastUpdated: new Date(),
            kycStatus: 'verified',
            amlStatus: 'clear',
            restrictions: [],
            approvedCountries: ['US', 'EU', 'UK', 'CA'],
            blockedCountries: ['IR', 'KP', 'SY']
        };

        logApiMetrics('/api/compliance/status/:address', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: status
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting compliance status for ${req.params.address}:`, error);
        logApiMetrics('/api/compliance/status/:address', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get compliance status',
            details: err.message
        });
    }
});

/**
 * POST /api/compliance/kyc
 * Submit KYC documents for verification
 */
router.post('/kyc', authMiddleware, validateKYCSubmission, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId, documentType, documentNumber, firstName, lastName, dateOfBirth, address, documentUrl } = req.body;

        // Authorization check - users can only submit their own KYC
        if (req.user?.id !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to submit KYC for this user'
            });
        }

        // Simulate KYC submission
        const kycSubmission = {
            submissionId: `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            status: 'pending',
            documentType,
            documentNumber,
            firstName,
            lastName,
            dateOfBirth,
            address,
            documentUrl,
            submittedAt: new Date(),
            estimatedProcessingTime: '24-48 hours'
        };

        logApiMetrics('/api/compliance/kyc', 'POST', 201, Date.now() - startTime, req.user?.id);

        res.status(201).json({
            success: true,
            message: 'KYC documents submitted successfully',
            data: kycSubmission
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error submitting KYC documents:', error);
        logApiMetrics('/api/compliance/kyc', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to submit KYC documents',
            details: err.message
        });
    }
});

/**
 * GET /api/compliance/kyc/:userId/status
 * Get KYC status for a user
 */
router.get('/kyc/:userId/status', authMiddleware, [
    param('userId').isString().notEmpty().withMessage('User ID is required')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId } = req.params;

        // Authorization check
        if (req.user?.id !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to KYC status'
            });
        }

        // Simulate KYC status
        const kycStatus = {
            userId,
            status: 'approved',
            verificationLevel: 'full',
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            documents: [
                {
                    type: 'passport',
                    status: 'verified',
                    verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
                }
            ],
            limits: {
                daily: 10000,
                monthly: 100000,
                annual: 1000000
            }
        };

        logApiMetrics('/api/compliance/kyc/:userId/status', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: kycStatus
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting KYC status for user ${req.params.userId}:`, error);
        logApiMetrics('/api/compliance/kyc/:userId/status', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get KYC status',
            details: err.message
        });
    }
});

/**
 * POST /api/compliance/transaction/verify
 * Verify transaction compliance
 */
router.post('/transaction/verify', authMiddleware, [
    body('transactionId').isString().notEmpty().withMessage('Transaction ID is required'),
    body('fromAddress').isEthereumAddress().withMessage('Valid from address is required'),
    body('toAddress').isEthereumAddress().withMessage('Valid to address is required'),
    body('amount').isNumeric().isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('currency').isString().notEmpty().withMessage('Currency is required')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { transactionId, fromAddress, toAddress, amount, currency } = req.body;

        // Simulate transaction verification
        const verification = {
            transactionId,
            status: 'approved',
            riskScore: 12,
            amlCheck: 'passed',
            sanctionsCheck: 'passed',
            pepCheck: 'passed',
            fromAddress: {
                address: fromAddress,
                riskLevel: 'low',
                isBlacklisted: false
            },
            toAddress: {
                address: toAddress,
                riskLevel: 'low',
                isBlacklisted: false
            },
            amount: parseFloat(amount),
            currency,
            verifiedAt: new Date(),
            flags: [],
            recommendations: []
        };

        logApiMetrics('/api/compliance/transaction/verify', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: verification
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error verifying transaction compliance:', error);
        logApiMetrics('/api/compliance/transaction/verify', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to verify transaction compliance',
            details: err.message
        });
    }
});

/**
 * GET /api/compliance/report
 * Generate compliance report (Admin only)
 */
router.get('/report', authMiddleware, [
    query('startDate').optional().isISO8601().withMessage('Valid start date required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required'),
    query('type').optional().isIn(['aml', 'kyc', 'sanctions', 'all']).withMessage('Valid report type required')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        // Only admins can generate compliance reports
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required for compliance reports'
            });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
        const reportType = req.query.type || 'all';

        // Simulate compliance report
        const report = {
            reportId: `report_${Date.now()}`,
            type: reportType,
            period: {
                startDate,
                endDate
            },
            summary: {
                totalTransactions: 1250,
                flaggedTransactions: 15,
                approvedTransactions: 1200,
                rejectedTransactions: 35,
                pendingReview: 0
            },
            kycStats: {
                totalSubmissions: 450,
                approved: 420,
                rejected: 20,
                pending: 10
            },
            amlStats: {
                totalChecks: 1250,
                passed: 1200,
                flagged: 50,
                highRisk: 5
            },
            sanctionsStats: {
                totalChecks: 1250,
                clear: 1245,
                matches: 5,
                falsePositives: 3
            },
            generatedAt: new Date(),
            generatedBy: req.user?.id
        };

        logApiMetrics('/api/compliance/report', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: report
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error generating compliance report:', error);
        logApiMetrics('/api/compliance/report', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate compliance report',
            details: err.message
        });
    }
});

export { router as complianceRouter };