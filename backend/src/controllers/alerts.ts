import { Router, Request, Response } from 'express';
import { AlertingService, AlertSeverity, AlertCategory, AlertRule } from '../services/AlertingService';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import { LoggingService } from '../services/LoggingService';

const router = Router();
const alertingService = new AlertingService(
  // Dependencies would be injected in a real NestJS setup
  null as any, null as any, null as any
);
const loggingService = new LoggingService();

// Get active alerts
router.get('/active',
  authMiddleware,
  [
    query('category')
      .optional()
      .isIn(Object.values(AlertCategory))
      .withMessage('Invalid alert category')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const category = req.query.category as AlertCategory;
      const alerts = await alertingService.getActiveAlerts(category);
      
      loggingService.info('Active alerts requested', {
        userId: req.user?.id,
        category,
        alertCount: alerts.length
      });
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get active alerts', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active alerts'
      });
    }
  }
);

// Get alert history
router.get('/history',
  authMiddleware,
  [
    query('hours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Hours must be between 1 and 168 (7 days)')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const alerts = await alertingService.getAlertHistory(hours);
      
      loggingService.info('Alert history requested', {
        userId: req.user?.id,
        hours,
        alertCount: alerts.length
      });
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        timeframe: `${hours} hours`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get alert history', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert history'
      });
    }
  }
);

// Resolve an alert
router.post('/:alertId/resolve',
  authMiddleware,
  [
    param('alertId')
      .notEmpty()
      .withMessage('Alert ID is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const resolvedBy = req.user?.id || 'unknown';
      
      await alertingService.resolveAlert(alertId, resolvedBy);
      
      loggingService.info('Alert resolved', {
        alertId,
        resolvedBy,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      loggingService.error('Failed to resolve alert', error, {
        alertId: req.params.alertId,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }
);

// Trigger a manual alert (admin only)
router.post('/trigger',
  authMiddleware,
  [
    body('title')
      .notEmpty()
      .withMessage('Alert title is required'),
    body('description')
      .notEmpty()
      .withMessage('Alert description is required'),
    body('severity')
      .isIn(Object.values(AlertSeverity))
      .withMessage('Invalid alert severity'),
    body('category')
      .isIn(Object.values(AlertCategory))
      .withMessage('Invalid alert category'),
    body('source')
      .notEmpty()
      .withMessage('Alert source is required'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Alert data must be an object')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      const { title, description, severity, category, source, data } = req.body;
      
      await alertingService.triggerAlert({
        title,
        description,
        severity,
        category,
        source,
        data
      });
      
      loggingService.info('Manual alert triggered', {
        title,
        severity,
        category,
        source,
        triggeredBy: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Alert triggered successfully'
      });
    } catch (error) {
      loggingService.error('Failed to trigger alert', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to trigger alert'
      });
    }
  }
);

// Get alert rules
router.get('/rules',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const rules = alertingService.getAlertRules();
      
      loggingService.info('Alert rules requested', {
        userId: req.user?.id,
        ruleCount: rules.length
      });
      
      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      loggingService.error('Failed to get alert rules', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert rules'
      });
    }
  }
);

// Add alert rule (admin only)
router.post('/rules',
  authMiddleware,
  [
    body('id')
      .notEmpty()
      .withMessage('Rule ID is required'),
    body('name')
      .notEmpty()
      .withMessage('Rule name is required'),
    body('description')
      .notEmpty()
      .withMessage('Rule description is required'),
    body('category')
      .isIn(Object.values(AlertCategory))
      .withMessage('Invalid alert category'),
    body('severity')
      .isIn(Object.values(AlertSeverity))
      .withMessage('Invalid alert severity'),
    body('condition')
      .notEmpty()
      .withMessage('Rule condition is required'),
    body('threshold')
      .optional()
      .isNumeric()
      .withMessage('Threshold must be a number'),
    body('enabled')
      .isBoolean()
      .withMessage('Enabled must be a boolean'),
    body('cooldownMinutes')
      .isInt({ min: 0 })
      .withMessage('Cooldown minutes must be a non-negative integer'),
    body('channels')
      .isArray()
      .withMessage('Channels must be an array')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      const rule: AlertRule = req.body;
      alertingService.addAlertRule(rule);
      
      loggingService.info('Alert rule added', {
        ruleId: rule.id,
        name: rule.name,
        createdBy: req.user?.id
      });
      
      res.status(201).json({
        success: true,
        message: 'Alert rule added successfully',
        data: rule
      });
    } catch (error) {
      loggingService.error('Failed to add alert rule', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to add alert rule'
      });
    }
  }
);

// Update alert rule (admin only)
router.put('/rules/:ruleId',
  authMiddleware,
  [
    param('ruleId')
      .notEmpty()
      .withMessage('Rule ID is required'),
    body('name')
      .optional()
      .notEmpty()
      .withMessage('Rule name cannot be empty'),
    body('description')
      .optional()
      .notEmpty()
      .withMessage('Rule description cannot be empty'),
    body('category')
      .optional()
      .isIn(Object.values(AlertCategory))
      .withMessage('Invalid alert category'),
    body('severity')
      .optional()
      .isIn(Object.values(AlertSeverity))
      .withMessage('Invalid alert severity'),
    body('condition')
      .optional()
      .notEmpty()
      .withMessage('Rule condition cannot be empty'),
    body('threshold')
      .optional()
      .isNumeric()
      .withMessage('Threshold must be a number'),
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean'),
    body('cooldownMinutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Cooldown minutes must be a non-negative integer'),
    body('channels')
      .optional()
      .isArray()
      .withMessage('Channels must be an array')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      const { ruleId } = req.params;
      const updates = req.body;
      
      alertingService.updateAlertRule(ruleId, updates);
      
      loggingService.info('Alert rule updated', {
        ruleId,
        updates,
        updatedBy: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Alert rule updated successfully'
      });
    } catch (error) {
      loggingService.error('Failed to update alert rule', error, {
        ruleId: req.params.ruleId,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update alert rule'
      });
    }
  }
);

// Delete alert rule (admin only)
router.delete('/rules/:ruleId',
  authMiddleware,
  [
    param('ruleId')
      .notEmpty()
      .withMessage('Rule ID is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      const { ruleId } = req.params;
      alertingService.removeAlertRule(ruleId);
      
      loggingService.info('Alert rule deleted', {
        ruleId,
        deletedBy: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Alert rule deleted successfully'
      });
    } catch (error) {
      loggingService.error('Failed to delete alert rule', error, {
        ruleId: req.params.ruleId,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert rule'
      });
    }
  }
);

// Get alert statistics
router.get('/stats',
  authMiddleware,
  [
    query('hours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Hours must be between 1 and 168 (7 days)')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const alerts = await alertingService.getAlertHistory(hours);
      
      // Calculate statistics
      const stats = {
        total: alerts.length,
        bySeverity: {
          critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
          error: alerts.filter(a => a.severity === AlertSeverity.ERROR).length,
          warning: alerts.filter(a => a.severity === AlertSeverity.WARNING).length,
          info: alerts.filter(a => a.severity === AlertSeverity.INFO).length
        },
        byCategory: {
          system: alerts.filter(a => a.category === AlertCategory.SYSTEM).length,
          business: alerts.filter(a => a.category === AlertCategory.BUSINESS).length,
          security: alerts.filter(a => a.category === AlertCategory.SECURITY).length,
          performance: alerts.filter(a => a.category === AlertCategory.PERFORMANCE).length,
          external_service: alerts.filter(a => a.category === AlertCategory.EXTERNAL_SERVICE).length
        },
        resolved: alerts.filter(a => a.resolved).length,
        active: alerts.filter(a => !a.resolved).length,
        timeframe: `${hours} hours`
      };
      
      loggingService.info('Alert statistics requested', {
        userId: req.user?.id,
        hours,
        totalAlerts: stats.total
      });
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get alert statistics', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert statistics'
      });
    }
  }
);

export { router as alertsRouter };
