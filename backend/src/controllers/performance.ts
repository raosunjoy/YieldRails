import { Router, Request, Response } from 'express';
import { PerformanceOptimizationService } from '../services/PerformanceOptimizationService';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import { LoggingService } from '../services/LoggingService';

const router = Router();
const performanceService = new PerformanceOptimizationService(
  // Dependencies would be injected in a real NestJS setup
  null as any, null as any, null as any, null as any
);
const loggingService = new LoggingService();

// Get current performance metrics
router.get('/metrics',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const metrics = await performanceService.collectPerformanceMetrics();
      
      loggingService.info('Performance metrics requested', {
        userId: req.user?.id,
        metricCount: metrics.length
      });
      
      res.json({
        success: true,
        data: metrics,
        count: metrics.length,
        summary: {
          normal: metrics.filter(m => m.status === 'normal').length,
          warning: metrics.filter(m => m.status === 'warning').length,
          critical: metrics.filter(m => m.status === 'critical').length
        },
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

// Get system health report
router.get('/health',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const healthReport = await performanceService.getSystemHealth();
      
      loggingService.info('System health report requested', {
        userId: req.user?.id,
        overallHealth: healthReport.overallHealth,
        healthScore: healthReport.healthScore
      });
      
      res.json({
        success: true,
        data: healthReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get system health report', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system health report'
      });
    }
  }
);

// Get optimization recommendations
router.get('/recommendations',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const recommendations = await performanceService.getOptimizationRecommendations();
      
      loggingService.info('Optimization recommendations requested', {
        userId: req.user?.id,
        recommendationCount: recommendations.length,
        criticalCount: recommendations.filter(r => r.priority === 'critical').length
      });
      
      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length,
        summary: {
          byPriority: {
            critical: recommendations.filter(r => r.priority === 'critical').length,
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length,
            low: recommendations.filter(r => r.priority === 'low').length
          },
          byCategory: {
            database: recommendations.filter(r => r.category === 'database').length,
            api: recommendations.filter(r => r.category === 'api').length,
            cache: recommendations.filter(r => r.category === 'cache').length,
            infrastructure: recommendations.filter(r => r.category === 'infrastructure').length,
            application: recommendations.filter(r => r.category === 'application').length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get optimization recommendations', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimization recommendations'
      });
    }
  }
);

// Get performance benchmarks
router.get('/benchmarks',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const benchmarks = await performanceService.getBenchmarks();
      
      loggingService.info('Performance benchmarks requested', {
        userId: req.user?.id,
        benchmarkCount: benchmarks.length
      });
      
      res.json({
        success: true,
        data: benchmarks,
        count: benchmarks.length,
        summary: {
          meeting_targets: benchmarks.filter(b => b.current <= b.target).length,
          exceeding_targets: benchmarks.filter(b => b.current > b.target).length,
          improving: benchmarks.filter(b => b.trend === 'improving').length,
          degrading: benchmarks.filter(b => b.trend === 'degrading').length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get performance benchmarks', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance benchmarks'
      });
    }
  }
);

// Get load test results
router.get('/load-tests',
  authMiddleware,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const loadTestResults = await performanceService.getLoadTestResults(limit);
      
      loggingService.info('Load test results requested', {
        userId: req.user?.id,
        resultCount: loadTestResults.length,
        limit
      });
      
      res.json({
        success: true,
        data: loadTestResults,
        count: loadTestResults.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get load test results', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve load test results'
      });
    }
  }
);

// Run load test (admin only)
router.post('/load-tests',
  authMiddleware,
  [
    body('name')
      .notEmpty()
      .withMessage('Test name is required'),
    body('virtualUsers')
      .isInt({ min: 1, max: 1000 })
      .withMessage('Virtual users must be between 1 and 1000'),
    body('duration')
      .isInt({ min: 10, max: 3600 })
      .withMessage('Duration must be between 10 and 3600 seconds'),
    body('targetEndpoint')
      .notEmpty()
      .withMessage('Target endpoint is required'),
    body('rampUpTime')
      .optional()
      .isInt({ min: 0, max: 300 })
      .withMessage('Ramp up time must be between 0 and 300 seconds')
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
      
      const { name, virtualUsers, duration, targetEndpoint, rampUpTime = 10 } = req.body;
      
      const config = {
        virtualUsers,
        duration,
        targetEndpoint,
        rampUpTime
      };
      
      // Run load test asynchronously
      const loadTestResult = await performanceService.runLoadTest(config);
      
      loggingService.info('Load test initiated', {
        testId: loadTestResult.testId,
        virtualUsers,
        duration,
        targetEndpoint,
        initiatedBy: req.user?.id
      });
      
      res.json({
        success: true,
        data: loadTestResult,
        message: 'Load test completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to run load test', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to run load test'
      });
    }
  }
);

// Refresh performance analysis (admin only)
router.post('/refresh',
  authMiddleware,
  [
    body('type')
      .isIn(['metrics', 'health', 'recommendations', 'benchmarks', 'all'])
      .withMessage('Invalid refresh type')
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
      
      const { type } = req.body;
      let refreshedData: any = null;
      
      switch (type) {
        case 'metrics':
          refreshedData = await performanceService.collectPerformanceMetrics();
          break;
        case 'health':
          refreshedData = await performanceService.assessSystemHealth();
          break;
        case 'recommendations':
          refreshedData = await performanceService.generateOptimizationRecommendations();
          break;
        case 'benchmarks':
          refreshedData = await performanceService.updateBenchmarks();
          break;
        case 'all':
          await Promise.all([
            performanceService.collectPerformanceMetrics(),
            performanceService.assessSystemHealth(),
            performanceService.generateOptimizationRecommendations(),
            performanceService.updateBenchmarks()
          ]);
          refreshedData = { message: 'All performance data refreshed' };
          break;
      }
      
      loggingService.info('Performance data refresh triggered', {
        type,
        triggeredBy: req.user?.id
      });
      
      res.json({
        success: true,
        message: `${type} performance data refreshed successfully`,
        data: refreshedData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to refresh performance data', error, {
        type: req.body.type,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to refresh performance data'
      });
    }
  }
);

// Get performance summary
router.get('/summary',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const [metrics, health, recommendations, benchmarks] = await Promise.all([
        performanceService.collectPerformanceMetrics(),
        performanceService.getSystemHealth(),
        performanceService.getOptimizationRecommendations(),
        performanceService.getBenchmarks()
      ]);
      
      const summary = {
        systemHealth: {
          overallHealth: health.overallHealth,
          healthScore: health.healthScore,
          componentCount: Object.keys(health.components).length,
          bottleneckCount: health.bottlenecks.length,
          criticalIssues: health.bottlenecks.filter(b => b.severity === 'high').length
        },
        performanceMetrics: {
          totalMetrics: metrics.length,
          normalMetrics: metrics.filter(m => m.status === 'normal').length,
          warningMetrics: metrics.filter(m => m.status === 'warning').length,
          criticalMetrics: metrics.filter(m => m.status === 'critical').length,
          worstPerformingMetric: metrics.sort((a, b) => {
            const statusWeight = { critical: 3, warning: 2, normal: 1 };
            return (statusWeight[b.status] || 1) - (statusWeight[a.status] || 1);
          })[0]?.metricType || 'none'
        },
        optimizations: {
          totalRecommendations: recommendations.length,
          criticalRecommendations: recommendations.filter(r => r.priority === 'critical').length,
          highPriorityRecommendations: recommendations.filter(r => r.priority === 'high').length,
          estimatedImprovementScore: recommendations.reduce((sum, r) => 
            sum + (r.impact.userExperience + r.impact.systemPerformance) / 2, 0) / recommendations.length || 0,
          topRecommendation: recommendations[0]?.title || 'No recommendations available'
        },
        benchmarks: {
          totalBenchmarks: benchmarks.length,
          meetingTargets: benchmarks.filter(b => b.current <= b.target).length,
          exceedingTargets: benchmarks.filter(b => b.current > b.target).length,
          improvingTrends: benchmarks.filter(b => b.trend === 'improving').length,
          degradingTrends: benchmarks.filter(b => b.trend === 'degrading').length,
          worstPerformingBenchmark: benchmarks.sort((a, b) => 
            (b.current / b.target) - (a.current / a.target))[0]?.name || 'none'
        }
      };
      
      loggingService.info('Performance summary requested', {
        userId: req.user?.id,
        healthScore: summary.systemHealth.healthScore,
        criticalIssues: summary.systemHealth.criticalIssues,
        totalRecommendations: summary.optimizations.totalRecommendations
      });
      
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get performance summary', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance summary'
      });
    }
  }
);

// Get specific optimization recommendation
router.get('/recommendations/:recommendationId',
  authMiddleware,
  [
    param('recommendationId')
      .notEmpty()
      .withMessage('Recommendation ID is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { recommendationId } = req.params;
      const recommendations = await performanceService.getOptimizationRecommendations();
      
      const recommendation = recommendations.find(r => r.id === recommendationId);
      
      if (!recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      loggingService.info('Individual optimization recommendation requested', {
        userId: req.user?.id,
        recommendationId,
        priority: recommendation.priority,
        category: recommendation.category
      });
      
      res.json({
        success: true,
        data: recommendation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get optimization recommendation', error, {
        userId: req.user?.id,
        recommendationId: req.params.recommendationId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimization recommendation'
      });
    }
  }
);

export { router as performanceRouter };