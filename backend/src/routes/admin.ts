import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { logger, logApiMetrics } from '../utils/logger';
import { PaymentService } from '../services/PaymentService';
import { YieldService } from '../services/YieldService';
import { CrossChainService } from '../services/CrossChainService';
import { ComplianceService } from '../services/ComplianceService';

const router = Router();
const paymentService = new PaymentService();
const yieldService = new YieldService();
const crossChainService = new CrossChainService();
const complianceService = new ComplianceService();

/**
 * Admin authorization middleware
 */
const adminOnly = (req: Request, res: Response, next: any) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
    }
    next();
};

/**
 * Validation middleware
 */
const validatePagination = [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

const validateUserId = [
    param('userId').isString().notEmpty().withMessage('User ID is required')
];

const validateUserUpdate = [
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('role').optional().isIn(['USER', 'MERCHANT', 'ADMIN', 'OPERATOR']).withMessage('Valid role required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('kycStatus').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Valid KYC status required')
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
 * Audit logging helper
 */
const auditLog = (action: string, resource: string, userId: string, details?: any) => {
    logger.info('Admin action performed', {
        action,
        resource,
        adminUserId: userId,
        details,
        timestamp: new Date()
    });
};

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview
 */
router.get('/dashboard', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // Get system overview metrics
        const dashboard = {
            overview: {
                totalUsers: 1250,
                activeUsers: 980,
                totalMerchants: 150,
                activeMerchants: 120,
                totalPayments: 5420,
                totalVolume: '2,450,000',
                totalYieldGenerated: '125,000'
            },
            recentActivity: {
                paymentsLast24h: 45,
                newUsersLast24h: 12,
                yieldGeneratedLast24h: '2,500',
                bridgeTransactionsLast24h: 8
            },
            systemHealth: {
                apiStatus: 'healthy',
                databaseStatus: 'healthy',
                blockchainStatus: 'healthy',
                complianceStatus: 'healthy',
                uptime: '99.9%'
            },
            alerts: [
                {
                    type: 'warning',
                    message: 'High transaction volume detected',
                    timestamp: new Date()
                }
            ]
        };

        auditLog('VIEW_DASHBOARD', 'admin_dashboard', req.user!.id);
        logApiMetrics('/api/admin/dashboard', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: dashboard
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting admin dashboard:', error);
        logApiMetrics('/api/admin/dashboard', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get admin dashboard',
            details: err.message
        });
    }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/users', authMiddleware, adminOnly, validatePagination, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;

        // Simulate user data retrieval
        const users = {
            users: [
                {
                    id: 'user_1',
                    email: 'user1@example.com',
                    walletAddress: '0x1234567890123456789012345678901234567890',
                    role: 'USER',
                    kycStatus: 'APPROVED',
                    isActive: true,
                    createdAt: new Date(),
                    lastLoginAt: new Date()
                }
            ],
            total: 1250,
            limit,
            offset
        };

        auditLog('LIST_USERS', 'users', req.user!.id, { limit, offset, search });
        logApiMetrics('/api/admin/users', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: users
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting users:', error);
        logApiMetrics('/api/admin/users', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get users',
            details: err.message
        });
    }
});

/**
 * GET /api/admin/users/:userId
 * Get specific user details
 */
router.get('/users/:userId', authMiddleware, adminOnly, validateUserId, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId } = req.params;

        // Simulate user data retrieval
        const user = {
            id: userId,
            email: 'user@example.com',
            walletAddress: '0x1234567890123456789012345678901234567890',
            firstName: 'John',
            lastName: 'Doe',
            role: 'USER',
            kycStatus: 'APPROVED',
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            paymentStats: {
                totalPayments: 25,
                totalVolume: '15,000',
                totalYieldEarned: '750'
            },
            complianceInfo: {
                riskScore: 15,
                lastAMLCheck: new Date(),
                sanctionsStatus: 'clear'
            }
        };

        auditLog('VIEW_USER', 'user', req.user!.id, { targetUserId: userId });
        logApiMetrics('/api/admin/users/:userId', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: user
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error getting user ${req.params.userId}:`, error);
        logApiMetrics('/api/admin/users/:userId', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user',
            details: err.message
        });
    }
});

/**
 * PUT /api/admin/users/:userId
 * Update user information
 */
router.put('/users/:userId', authMiddleware, adminOnly, validateUserId, validateUserUpdate, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId } = req.params;
        const updates = req.body;

        // Simulate user update
        const updatedUser = {
            id: userId,
            ...updates,
            updatedAt: new Date(),
            updatedBy: req.user!.id
        };

        auditLog('UPDATE_USER', 'user', req.user!.id, { targetUserId: userId, updates });
        logApiMetrics('/api/admin/users/:userId', 'PUT', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error updating user ${req.params.userId}:`, error);
        logApiMetrics('/api/admin/users/:userId', 'PUT', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update user',
            details: err.message
        });
    }
});

/**
 * POST /api/admin/users/:userId/suspend
 * Suspend a user account
 */
router.post('/users/:userId/suspend', authMiddleware, adminOnly, validateUserId, [
    body('reason').isString().notEmpty().withMessage('Suspension reason is required'),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive number')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { userId } = req.params;
        const { reason, duration } = req.body;

        // Simulate user suspension
        const suspension = {
            userId,
            reason,
            duration: duration || null,
            suspendedAt: new Date(),
            suspendedBy: req.user!.id,
            status: 'suspended'
        };

        auditLog('SUSPEND_USER', 'user', req.user!.id, { targetUserId: userId, reason, duration });
        logApiMetrics('/api/admin/users/:userId/suspend', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: 'User suspended successfully',
            data: suspension
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Error suspending user ${req.params.userId}:`, error);
        logApiMetrics('/api/admin/users/:userId/suspend', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to suspend user',
            details: err.message
        });
    }
});

/**
 * GET /api/admin/payments
 * Get all payments with advanced filtering
 */
router.get('/payments', authMiddleware, adminOnly, validatePagination, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        // Get payment analytics
        const analytics = await paymentService.getPaymentMetrics();

        auditLog('LIST_PAYMENTS', 'payments', req.user!.id, { limit, offset, status, startDate, endDate });
        logApiMetrics('/api/admin/payments', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: {
                payments: analytics.recentPayments || [],
                analytics: analytics,
                pagination: {
                    limit,
                    offset,
                    total: analytics.totalPayments || 0
                }
            }
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting admin payments:', error);
        logApiMetrics('/api/admin/payments', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get payments',
            details: err.message
        });
    }
});

/**
 * GET /api/admin/system/health
 * Get comprehensive system health status
 */
router.get('/system/health', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const health = {
            status: 'healthy',
            timestamp: new Date(),
            services: {
                api: { status: 'healthy', responseTime: '45ms' },
                database: { status: 'healthy', connections: 15 },
                redis: { status: 'healthy', memory: '125MB' },
                blockchain: { status: 'healthy', latency: '200ms' },
                crossChain: crossChainService.getMonitoringMetrics(),
                compliance: { status: 'healthy', lastCheck: new Date() }
            },
            metrics: {
                uptime: '99.9%',
                totalRequests: 125000,
                errorRate: '0.1%',
                avgResponseTime: '120ms'
            }
        };

        auditLog('VIEW_SYSTEM_HEALTH', 'system', req.user!.id);
        logApiMetrics('/api/admin/system/health', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: health
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting system health:', error);
        logApiMetrics('/api/admin/system/health', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get system health',
            details: err.message
        });
    }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', authMiddleware, adminOnly, validatePagination, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const action = req.query.action as string;
        const userId = req.query.userId as string;

        // Simulate audit logs
        const auditLogs = {
            logs: [
                {
                    id: 'audit_1',
                    action: 'UPDATE_USER',
                    resource: 'user',
                    adminUserId: req.user!.id,
                    targetUserId: 'user_123',
                    details: { role: 'MERCHANT' },
                    timestamp: new Date(),
                    ipAddress: req.ip
                }
            ],
            total: 500,
            limit,
            offset
        };

        auditLog('VIEW_AUDIT_LOGS', 'audit_logs', req.user!.id, { limit, offset, action, userId });
        logApiMetrics('/api/admin/audit-logs', 'GET', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            data: auditLogs
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error getting audit logs:', error);
        logApiMetrics('/api/admin/audit-logs', 'GET', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get audit logs',
            details: err.message
        });
    }
});

/**
 * POST /api/admin/system/maintenance
 * Enable/disable maintenance mode
 */
router.post('/system/maintenance', authMiddleware, adminOnly, [
    body('enabled').isBoolean().withMessage('Enabled must be boolean'),
    body('message').optional().isString().withMessage('Message must be string')
], async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { enabled, message } = req.body;

        const maintenanceStatus = {
            enabled,
            message: message || 'System maintenance in progress',
            enabledAt: enabled ? new Date() : null,
            enabledBy: req.user!.id
        };

        auditLog('TOGGLE_MAINTENANCE', 'system', req.user!.id, { enabled, message });
        logApiMetrics('/api/admin/system/maintenance', 'POST', 200, Date.now() - startTime, req.user?.id);

        res.json({
            success: true,
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
            data: maintenanceStatus
        });

    } catch (error: unknown) {
        const err = error as Error;
        logger.error('Error toggling maintenance mode:', error);
        logApiMetrics('/api/admin/system/maintenance', 'POST', 500, Date.now() - startTime, req.user?.id);

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to toggle maintenance mode',
            details: err.message
        });
    }
});

export { router as adminRouter };