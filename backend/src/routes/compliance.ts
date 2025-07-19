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

const validateTransactionVerification = [
    body('transactionId').isString().notEmpty().withMessage('Transaction ID is required'),
    body('fromAddress').isEthereumAddress().withMessage('Valid from address is required'),
    body('toAddress').isEthereumAddress().withMessage('Valid to address is required'),
    body('amount').isNumeric().isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('currency').isString().notEmpty().withMessage('Currency is required')
];

const validateReportQuery = [
    query('startDate').optional().isISO8601().withMessage('Valid start date required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required'),
    query('type').optional().isIn(['aml', 'kyc', 'sanctions', 'all']).withMessage('Valid report type required')
];

const validateRiskAssessment = [
    body('address').isEthereumAddress().withMessage('Valid Ethereum address is required'),
    body('transactionCount').optional().isInt({ min: 0 }).withMessage('Transaction count must be a positive integer'),
    body('totalVolume').optional().isFloat({ min: 0 }).withMessage('Total volume must be a positive number')
];

const validateSanctionsCheck = [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('address').optional().isEthereumAddress().withMessage('Valid Ethereum address is required')
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
        
        // Use ComplianceService to check address risk
        const riskAssessment = await complianceService.checkAddress(address);

        logApiMetrics('/api/compliance/check-address', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                address: riskAssessment.address,
                isCompliant: riskAssessment.riskLevel !== 'VERY_HIGH' && !riskAssessment.sanctions,
                riskLevel: riskAssessment.riskLevel.toLowerCase(),
                riskScore: riskAssessment.riskScore,
                sanctions: riskAssessment.sanctions,
                pep: riskAssessment.pep,
                amlFlags: riskAssessment.amlFlags,
                lastChecked: riskAssessment.lastChecked,
                source: riskAssessment.source
            }
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
        
        // Use ComplianceService to check address risk
        const riskAssessment = await complianceService.checkAddress(address);
        
        // Determine compliance status based on risk assessment
        const status = riskAssessment.sanctions ? 'blocked' : 
                      riskAssessment.riskLevel === 'VERY_HIGH' ? 'restricted' :
                      riskAssessment.riskLevel === 'HIGH' ? 'monitored' : 'approved';
        
        // Determine allowed countries based on sanctions status
        const approvedCountries = riskAssessment.sanctions ? [] : ['US', 'EU', 'UK', 'CA', 'SG', 'AU', 'JP'];
        const blockedCountries = riskAssessment.sanctions ? ['ALL'] : ['IR', 'KP', 'SY', 'CU', 'VE'];
        
        // Determine restrictions based on risk level
        const restrictions = [];
        if (riskAssessment.riskLevel === 'VERY_HIGH') {
            restrictions.push('NO_TRANSACTIONS_ALLOWED');
        } else if (riskAssessment.riskLevel === 'HIGH') {
            restrictions.push('ENHANCED_DUE_DILIGENCE');
            restrictions.push('TRANSACTION_LIMIT_10000');
        } else if (riskAssessment.riskLevel === 'MEDIUM') {
            restrictions.push('TRANSACTION_LIMIT_50000');
        }

        logApiMetrics('/api/compliance/status/:address', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                address,
                status,
                riskScore: riskAssessment.riskScore,
                riskLevel: riskAssessment.riskLevel.toLowerCase(),
                lastUpdated: riskAssessment.lastChecked,
                kycStatus: status === 'approved' ? 'verified' : 'required',
                amlStatus: riskAssessment.sanctions ? 'flagged' : 'clear',
                restrictions,
                approvedCountries,
                blockedCountries
            }
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

        // Submit KYC documents for verification
        const kycResult = await complianceService.performKYC({
            userId,
            documentType,
            documentNumber,
            firstName,
            lastName,
            dateOfBirth,
            address,
            documentUrl
        });

        logApiMetrics('/api/compliance/kyc', 'POST', 201, Date.now() - startTime, req.user?.id);

        res.status(201).json({
            success: true,
            message: 'KYC documents submitted successfully',
            data: {
                submissionId: kycResult.submissionId,
                userId,
                status: kycResult.status.toLowerCase(),
                documentType,
                documentNumber,
                firstName,
                lastName,
                dateOfBirth,
                address,
                documentUrl,
                submittedAt: new Date(),
                estimatedProcessingTime: kycResult.estimatedProcessingTime
            }
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

        // Get user KYC status from database
        const user = await complianceService.getUserKYCStatus(userId);
        
        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        logApiMetrics('/api/compliance/kyc/:userId/status', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                userId,
                status: user.kycStatus.toLowerCase(),
                verificationLevel: user.kycStatus === 'APPROVED' ? 'full' : 'none',
                submittedAt: user.kycSubmittedAt || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                approvedAt: user.kycStatus === 'APPROVED' ? user.kycApprovedAt || new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) : null,
                expiresAt: user.kycStatus === 'APPROVED' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
                documents: user.documents || [
                    {
                        type: 'passport',
                        status: user.kycStatus.toLowerCase(),
                        verifiedAt: user.kycStatus === 'APPROVED' ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) : null
                    }
                ],
                limits: {
                    daily: user.kycStatus === 'APPROVED' ? 10000 : 1000,
                    monthly: user.kycStatus === 'APPROVED' ? 100000 : 5000,
                    annual: user.kycStatus === 'APPROVED' ? 1000000 : 25000
                }
            }
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
router.post('/transaction/verify', authMiddleware, validateTransactionVerification, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { transactionId, fromAddress, toAddress, amount, currency } = req.body;

        // Assess transaction risk
        const riskAssessment = await complianceService.assessTransactionRisk({
            transactionId,
            fromAddress,
            toAddress,
            amount: parseFloat(amount),
            currency
        });

        // Determine verification status based on risk assessment
        const status = riskAssessment.riskLevel === 'VERY_HIGH' ? 'rejected' :
                      riskAssessment.riskLevel === 'HIGH' ? 'review_required' : 'approved';

        logApiMetrics('/api/compliance/transaction/verify', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                transactionId,
                status,
                riskScore: riskAssessment.riskScore,
                riskLevel: riskAssessment.riskLevel.toLowerCase(),
                amlCheck: riskAssessment.flags.length > 0 ? 'flagged' : 'passed',
                sanctionsCheck: riskAssessment.flags.includes('SANCTIONS_MATCH') ? 'failed' : 'passed',
                pepCheck: riskAssessment.flags.includes('PEP_INVOLVED') ? 'failed' : 'passed',
                fromAddress: {
                    address: fromAddress,
                    riskLevel: riskAssessment.riskLevel.toLowerCase(),
                    isBlacklisted: riskAssessment.flags.includes('SANCTIONS_MATCH')
                },
                toAddress: {
                    address: toAddress,
                    riskLevel: riskAssessment.riskLevel.toLowerCase(),
                    isBlacklisted: riskAssessment.flags.includes('SANCTIONS_MATCH')
                },
                amount: parseFloat(amount),
                currency,
                verifiedAt: new Date(),
                flags: riskAssessment.flags,
                recommendations: riskAssessment.recommendations
            }
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
router.get('/report', authMiddleware, validateReportQuery, async (req: Request, res: Response) => {
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
        const reportType = (req.query.type as string) || 'all';

        // Generate compliance report
        const report = await complianceService.generateComplianceReport(startDate, endDate, reportType as 'aml' | 'kyc' | 'sanctions' | 'all');

        logApiMetrics('/api/compliance/report', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                ...report,
                generatedAt: new Date(),
                generatedBy: req.user?.id
            }
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

/**
 * POST /api/compliance/sanctions/check
 * Check name against sanctions lists
 */
router.post('/sanctions/check', authMiddleware, validateSanctionsCheck, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { name, address } = req.body;

        // Check sanctions lists
        const sanctionsResult = await complianceService.checkSanctionsList(name, address);

        logApiMetrics('/api/compliance/sanctions/check', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                name,
                address,
                isMatch: sanctionsResult.isMatch,
                confidence: sanctionsResult.confidence,
                matches: sanctionsResult.matches,
                checkedAt: new Date(),
                status: sanctionsResult.isMatch ? 'blocked' : 'approved'
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error checking sanctions lists:', error);
        logApiMetrics('/api/compliance/sanctions/check', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check sanctions lists',
            details: err.message
        });
    }
});

/**
 * POST /api/compliance/risk/assess
 * Perform comprehensive risk assessment
 */
router.post('/risk/assess', authMiddleware, validateRiskAssessment, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { address, transactionCount, totalVolume } = req.body;

        // Get address risk assessment
        const addressRisk = await complianceService.checkAddress(address);

        // Calculate additional risk factors
        const velocityRisk = transactionCount ? Math.min(100, transactionCount / 10 * 20) : 0;
        const volumeRisk = totalVolume ? Math.min(100, totalVolume / 10000 * 10) : 0;

        // Combine risk scores
        const combinedRiskScore = Math.min(100, addressRisk.riskScore * 0.6 + velocityRisk * 0.2 + volumeRisk * 0.2);
        
        // Determine risk level
        const riskLevel = combinedRiskScore >= 80 ? 'VERY_HIGH' :
                         combinedRiskScore >= 60 ? 'HIGH' :
                         combinedRiskScore >= 30 ? 'MEDIUM' : 'LOW';

        // Generate recommendations
        const recommendations = [];
        if (riskLevel === 'VERY_HIGH') {
            recommendations.push('Block all transactions');
            recommendations.push('Report to compliance team');
        } else if (riskLevel === 'HIGH') {
            recommendations.push('Require enhanced due diligence');
            recommendations.push('Set transaction limits');
        } else if (riskLevel === 'MEDIUM') {
            recommendations.push('Monitor activity');
        }

        logApiMetrics('/api/compliance/risk/assess', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                address,
                baseRiskScore: addressRisk.riskScore,
                velocityRiskScore: velocityRisk,
                volumeRiskScore: volumeRisk,
                combinedRiskScore,
                riskLevel,
                sanctions: addressRisk.sanctions,
                pep: addressRisk.pep,
                flags: addressRisk.amlFlags,
                recommendations,
                assessedAt: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error performing risk assessment:', error);
        logApiMetrics('/api/compliance/risk/assess', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to perform risk assessment',
            details: err.message
        });
    }
});

/**
 * GET /api/compliance/merchant/:merchantId
 * Check merchant compliance status
 */
router.get('/merchant/:merchantId', authMiddleware, [
    param('merchantId').isString().notEmpty().withMessage('Merchant ID is required')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { merchantId } = req.params;

        // Only admins and the merchant itself can check compliance
        if (req.user?.role !== 'admin' && req.user?.id !== merchantId) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to merchant compliance status'
            });
        }

        // Check merchant compliance
        const merchantCompliance = await complianceService.checkMerchant(merchantId);

        logApiMetrics('/api/compliance/merchant/:merchantId', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                merchantId,
                isCompliant: merchantCompliance.isCompliant,
                issues: merchantCompliance.issues,
                recommendations: merchantCompliance.recommendations,
                checkedAt: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error checking merchant compliance for ${req.params.merchantId}:`, error);
        logApiMetrics('/api/compliance/merchant/:merchantId', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check merchant compliance',
            details: err.message
        });
    }
});

/**
 * POST /api/compliance/document/upload
 * Upload KYC document
 */
router.post('/document/upload', authMiddleware, [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('documentType').isIn(['passport', 'drivers_license', 'national_id', 'utility_bill', 'bank_statement']).withMessage('Valid document type is required'),
    body('documentBase64').isString().notEmpty().withMessage('Document content is required'),
    body('fileName').isString().notEmpty().withMessage('File name is required')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId, documentType, documentBase64, fileName } = req.body;

        // Authorization check
        if (req.user?.id !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to upload documents for this user'
            });
        }

        // Upload document
        const documentUrl = await complianceService.uploadDocument(userId, documentType, documentBase64, fileName);

        logApiMetrics('/api/compliance/document/upload', 'POST', 201, Date.now() - startTime, req.user?.id);

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                userId,
                documentType,
                documentUrl,
                uploadedAt: new Date()
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error uploading document:', error);
        logApiMetrics('/api/compliance/document/upload', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to upload document',
            details: err.message
        });
    }
});

/**
 * GET /api/compliance/audit-trail
 * Get compliance audit trail (Admin only)
 */
router.get('/audit-trail', authMiddleware, [
    query('startDate').optional().isISO8601().withMessage('Valid start date required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required'),
    query('userId').optional().isString().withMessage('Valid user ID required'),
    query('action').optional().isString().withMessage('Valid action required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        // Only admins can access audit trail
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required for audit trail'
            });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
        const userId = req.query.userId as string;
        const action = req.query.action as string;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        // Get audit trail
        const auditTrail = await complianceService.getAuditTrail(startDate, endDate, userId, action, limit, offset);

        logApiMetrics('/api/compliance/audit-trail', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: auditTrail
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting audit trail:', error);
        logApiMetrics('/api/compliance/audit-trail', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get audit trail',
            details: err.message
        });
    }
});

export { router as complianceRouter };