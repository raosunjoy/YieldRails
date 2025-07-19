import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { query } from 'express-validator';
import { LoggingService } from '../services/LoggingService';

const router = Router();
const analyticsService = new AnalyticsService(
  // Dependencies would be injected in a real NestJS setup
  null as any, null as any, null as any, null as any, null as any
);
const loggingService = new LoggingService();

// Validation rules
const timeframeValidation = [
  query('timeframe')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Timeframe must be one of: day, week, month, year')
];

// Business metrics endpoint
router.get('/business-metrics',
  authMiddleware,
  timeframeValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'month';
      const metrics = await analyticsService.getBusinessMetrics(timeframe as any);
      
      loggingService.info('Business metrics requested', {
        userId: req.user?.id,
        timeframe,
        totalPayments: metrics.totalPayments
      });
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get business metrics', error, {
        userId: req.user?.id,
        timeframe: req.query.timeframe
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve business metrics'
      });
    }
  }
);

// Performance metrics endpoint
router.get('/performance-metrics',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getPerformanceMetrics();
      
      loggingService.info('Performance metrics requested', {
        userId: req.user?.id,
        apiResponseTime: metrics.apiResponseTime.average
      });
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get performance metrics', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    }
  }
);

// User analytics endpoint
router.get('/user-analytics',
  authMiddleware,
  timeframeValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'month';
      const analytics = await analyticsService.getUserAnalytics(timeframe as any);
      
      loggingService.info('User analytics requested', {
        userId: req.user?.id,
        timeframe,
        dailyActiveUsers: analytics.dailyActiveUsers
      });
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get user analytics', error, {
        userId: req.user?.id,
        timeframe: req.query.timeframe
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user analytics'
      });
    }
  }
);

// Yield analytics endpoint
router.get('/yield-analytics',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const analytics = await analyticsService.getYieldAnalytics();
      
      loggingService.info('Yield analytics requested', {
        userId: req.user?.id,
        totalValueLocked: analytics.totalValueLocked
      });
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get yield analytics', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve yield analytics'
      });
    }
  }
);

// Real-time metrics endpoint
router.get('/real-time-metrics',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      
      loggingService.info('Real-time metrics requested', {
        userId: req.user?.id,
        activePayments: metrics.activePayments
      });
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get real-time metrics', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve real-time metrics'
      });
    }
  }
);

// Analytics dashboard data (combined metrics)
router.get('/dashboard',
  authMiddleware,
  timeframeValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'month';
      
      // Get all metrics in parallel
      const [businessMetrics, performanceMetrics, userAnalytics, yieldAnalytics, realTimeMetrics] = await Promise.all([
        analyticsService.getBusinessMetrics(timeframe as any),
        analyticsService.getPerformanceMetrics(),
        analyticsService.getUserAnalytics(timeframe as any),
        analyticsService.getYieldAnalytics(),
        analyticsService.getRealTimeMetrics()
      ]);
      
      const dashboardData = {
        business: businessMetrics,
        performance: performanceMetrics,
        users: userAnalytics,
        yield: yieldAnalytics,
        realTime: realTimeMetrics
      };
      
      loggingService.info('Analytics dashboard requested', {
        userId: req.user?.id,
        timeframe,
        totalPayments: businessMetrics.totalPayments,
        activeUsers: userAnalytics.dailyActiveUsers
      });
      
      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get dashboard data', error, {
        userId: req.user?.id,
        timeframe: req.query.timeframe
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }
);

// Refresh analytics cache (admin only)
router.post('/refresh-cache',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin (in a real app, you'd check user roles)
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      await analyticsService.refreshAnalyticsCache();
      
      loggingService.info('Analytics cache refreshed', {
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Analytics cache refreshed successfully'
      });
    } catch (error) {
      loggingService.error('Failed to refresh analytics cache', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to refresh analytics cache'
      });
    }
  }
);

// Export data for external analysis
router.get('/export',
  authMiddleware,
  [
    query('type')
      .isIn(['business', 'performance', 'users', 'yield', 'all'])
      .withMessage('Export type must be one of: business, performance, users, yield, all'),
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    ...timeframeValidation
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { type, format = 'json', timeframe = 'month' } = req.query;
      
      let data: any;
      
      switch (type) {
        case 'business':
          data = await analyticsService.getBusinessMetrics(timeframe as any);
          break;
        case 'performance':
          data = await analyticsService.getPerformanceMetrics();
          break;
        case 'users':
          data = await analyticsService.getUserAnalytics(timeframe as any);
          break;
        case 'yield':
          data = await analyticsService.getYieldAnalytics();
          break;
        case 'all':
          data = {
            business: await analyticsService.getBusinessMetrics(timeframe as any),
            performance: await analyticsService.getPerformanceMetrics(),
            users: await analyticsService.getUserAnalytics(timeframe as any),
            yield: await analyticsService.getYieldAnalytics(),
            realTime: await analyticsService.getRealTimeMetrics()
          };
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid export type'
          });
      }
      
      loggingService.info('Analytics data exported', {
        userId: req.user?.id,
        type,
        format,
        timeframe
      });
      
      if (format === 'csv') {
        // Convert to CSV format (simplified)
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeframe}.csv"`);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeframe}.json"`);
        res.json({
          success: true,
          data,
          exportedAt: new Date().toISOString(),
          parameters: { type, timeframe }
        });
      }
    } catch (error) {
      loggingService.error('Failed to export analytics data', error, {
        userId: req.user?.id,
        type: req.query.type,
        format: req.query.format
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics data'
      });
    }
  }
);

// Helper function to convert data to CSV
function convertToCSV(data: any): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');
    
    return csvContent;
  } else {
    // Convert object to key-value pairs
    const rows = Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    ]);
    
    return ['Key,Value', ...rows.map(row => row.map(cell => JSON.stringify(cell)).join(','))].join('\n');
  }
}

export { router as analyticsRouter };
