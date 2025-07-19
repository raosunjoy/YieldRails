import { Router, Request, Response } from 'express';
import { UserBehaviorAnalyticsService } from '../services/UserBehaviorAnalyticsService';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import { LoggingService } from '../services/LoggingService';

const router = Router();
const userBehaviorService = new UserBehaviorAnalyticsService(
  // Dependencies would be injected in a real NestJS setup
  null as any, null as any, null as any, null as any, null as any
);
const loggingService = new LoggingService();

// Get user segments
router.get('/segments',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const segments = await userBehaviorService.getUserSegments();
      
      loggingService.info('User segments requested', {
        userId: req.user?.id,
        segmentCount: segments.length
      });
      
      res.json({
        success: true,
        data: segments,
        count: segments.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get user segments', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user segments'
      });
    }
  }
);

// Get cohort analysis
router.get('/cohorts',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const cohorts = await userBehaviorService.getUserCohorts();
      
      loggingService.info('User cohorts requested', {
        userId: req.user?.id,
        cohortCount: cohorts.length
      });
      
      res.json({
        success: true,
        data: cohorts,
        count: cohorts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get user cohorts', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user cohorts'
      });
    }
  }
);

// Get behavior patterns
router.get('/patterns',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const patterns = await userBehaviorService.getBehaviorPatterns();
      
      loggingService.info('Behavior patterns requested', {
        userId: req.user?.id,
        patternCount: patterns.length
      });
      
      res.json({
        success: true,
        data: patterns,
        count: patterns.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get behavior patterns', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve behavior patterns'
      });
    }
  }
);

// Get business insights
router.get('/insights',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const insights = await userBehaviorService.getBusinessInsights();
      
      loggingService.info('Business insights requested', {
        userId: req.user?.id,
        insightCount: insights.length,
        highPriorityCount: insights.filter(i => i.priority === 'high' || i.priority === 'critical').length
      });
      
      res.json({
        success: true,
        data: insights,
        count: insights.length,
        summary: {
          byCategory: {
            user_behavior: insights.filter(i => i.category === 'user_behavior').length,
            revenue: insights.filter(i => i.category === 'revenue').length,
            product: insights.filter(i => i.category === 'product').length,
            market: insights.filter(i => i.category === 'market').length,
            risk: insights.filter(i => i.category === 'risk').length
          },
          byPriority: {
            critical: insights.filter(i => i.priority === 'critical').length,
            high: insights.filter(i => i.priority === 'high').length,
            medium: insights.filter(i => i.priority === 'medium').length,
            low: insights.filter(i => i.priority === 'low').length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get business insights', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve business insights'
      });
    }
  }
);

// Get user journeys
router.get('/journeys',
  authMiddleware,
  [
    query('userIds')
      .optional()
      .isString()
      .withMessage('User IDs must be a comma-separated string'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      let userIds: string[] | undefined;
      
      if (req.query.userIds) {
        userIds = (req.query.userIds as string).split(',').map(id => id.trim());
      }
      
      const journeys = await userBehaviorService.mapUserJourneys(userIds);
      
      loggingService.info('User journeys requested', {
        userId: req.user?.id,
        requestedUsers: userIds?.length || 'all',
        journeyCount: journeys.length
      });
      
      // Calculate summary statistics
      const stageDistribution = journeys.reduce((acc, journey) => {
        acc[journey.currentStage] = (acc[journey.currentStage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const averageConversionProb = journeys.reduce((sum, j) => sum + j.conversionProbability, 0) / journeys.length;
      const averageChurnRisk = journeys.reduce((sum, j) => sum + j.churnRisk, 0) / journeys.length;
      
      res.json({
        success: true,
        data: journeys,
        count: journeys.length,
        summary: {
          stageDistribution,
          averageConversionProbability: averageConversionProb || 0,
          averageChurnRisk: averageChurnRisk || 0,
          highChurnRiskUsers: journeys.filter(j => j.churnRisk > 70).length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get user journeys', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user journeys'
      });
    }
  }
);

// Get specific user journey
router.get('/journeys/:userId',
  authMiddleware,
  [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const journeys = await userBehaviorService.mapUserJourneys([userId]);
      
      if (journeys.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User journey not found'
        });
      }
      
      const journey = journeys[0];
      
      loggingService.info('Individual user journey requested', {
        userId: req.user?.id,
        targetUserId: userId,
        currentStage: journey.currentStage,
        churnRisk: journey.churnRisk
      });
      
      res.json({
        success: true,
        data: journey,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get user journey', error, {
        userId: req.user?.id,
        targetUserId: req.params.userId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user journey'
      });
    }
  }
);

// Trigger analytics refresh (admin only)
router.post('/refresh',
  authMiddleware,
  [
    body('type')
      .isIn(['segments', 'cohorts', 'patterns', 'insights', 'all'])
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
        case 'segments':
          refreshedData = await userBehaviorService.analyzeUserSegments();
          break;
        case 'cohorts':
          refreshedData = await userBehaviorService.analyzeCohorts();
          break;
        case 'patterns':
          refreshedData = await userBehaviorService.identifyBehaviorPatterns();
          break;
        case 'insights':
          refreshedData = await userBehaviorService.generateBusinessInsights();
          break;
        case 'all':
          await Promise.all([
            userBehaviorService.analyzeUserSegments(),
            userBehaviorService.analyzeCohorts(),
            userBehaviorService.identifyBehaviorPatterns(),
            userBehaviorService.generateBusinessInsights()
          ]);
          refreshedData = { message: 'All analytics refreshed' };
          break;
      }
      
      loggingService.info('Analytics refresh triggered', {
        type,
        triggeredBy: req.user?.id
      });
      
      res.json({
        success: true,
        message: `${type} analytics refreshed successfully`,
        data: refreshedData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to refresh analytics', error, {
        type: req.body.type,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to refresh analytics'
      });
    }
  }
);

// Get analytics summary
router.get('/summary',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const [segments, cohorts, patterns, insights] = await Promise.all([
        userBehaviorService.getUserSegments(),
        userBehaviorService.getUserCohorts(),
        userBehaviorService.getBehaviorPatterns(),
        userBehaviorService.getBusinessInsights()
      ]);
      
      const summary = {
        userSegments: {
          total: segments.length,
          totalUsers: segments.reduce((sum, s) => sum + s.userCount, 0),
          averageValue: segments.reduce((sum, s) => sum + s.averageValue, 0) / segments.length,
          topSegment: segments.sort((a, b) => b.userCount - a.userCount)[0]?.name || 'N/A'
        },
        cohortAnalysis: {
          totalCohorts: cohorts.length,
          averageRetention30Day: cohorts.reduce((sum, c) => sum + c.retentionRates.day30, 0) / cohorts.length,
          averageLifetimeValue: cohorts.reduce((sum, c) => sum + c.lifetimeValue.average, 0) / cohorts.length,
          bestPerformingCohort: cohorts.sort((a, b) => b.retentionRates.day30 - a.retentionRates.day30)[0]?.name || 'N/A'
        },
        behaviorPatterns: {
          totalPatterns: patterns.length,
          totalUsersInPatterns: patterns.reduce((sum, p) => sum + p.userCount, 0),
          highEngagementUsers: patterns.filter(p => p.characteristics.engagement === 'high').reduce((sum, p) => sum + p.userCount, 0),
          totalBusinessImpact: patterns.reduce((sum, p) => sum + p.businessImpact.revenue, 0)
        },
        businessInsights: {
          totalInsights: insights.length,
          criticalInsights: insights.filter(i => i.priority === 'critical').length,
          highPriorityInsights: insights.filter(i => i.priority === 'high').length,
          categories: {
            userBehavior: insights.filter(i => i.category === 'user_behavior').length,
            revenue: insights.filter(i => i.category === 'revenue').length,
            product: insights.filter(i => i.category === 'product').length,
            risk: insights.filter(i => i.category === 'risk').length
          }
        }
      };
      
      loggingService.info('Analytics summary requested', {
        userId: req.user?.id,
        totalInsights: summary.businessInsights.totalInsights,
        criticalInsights: summary.businessInsights.criticalInsights
      });
      
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get analytics summary', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics summary'
      });
    }
  }
);

export { router as userBehaviorRouter };