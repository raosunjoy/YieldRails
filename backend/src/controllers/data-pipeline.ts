import { Router, Request, Response } from 'express';
import { DataPipelineService } from '../services/DataPipelineService';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import { LoggingService } from '../services/LoggingService';

const router = Router();
const dataPipelineService = new DataPipelineService(
  // Dependencies would be injected in a real NestJS setup
  null as any, null as any, null as any, null as any, null as any
);
const loggingService = new LoggingService();

// Get ETL job statuses
router.get('/jobs',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const jobStatuses = await dataPipelineService.getETLJobStatus();
      
      loggingService.info('ETL job statuses requested', {
        userId: req.user?.id,
        jobCount: jobStatuses.length
      });
      
      res.json({
        success: true,
        data: jobStatuses,
        count: jobStatuses.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get ETL job statuses', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve ETL job statuses'
      });
    }
  }
);

// Get specific ETL job status
router.get('/jobs/:jobId',
  authMiddleware,
  [
    param('jobId')
      .notEmpty()
      .withMessage('Job ID is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const jobStatuses = await dataPipelineService.getETLJobStatus(jobId);
      
      if (jobStatuses.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }
      
      loggingService.info('ETL job status requested', {
        userId: req.user?.id,
        jobId
      });
      
      res.json({
        success: true,
        data: jobStatuses[0],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get ETL job status', error, {
        userId: req.user?.id,
        jobId: req.params.jobId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve ETL job status'
      });
    }
  }
);

// Trigger ETL job (admin only)
router.post('/jobs/:jobId/trigger',
  authMiddleware,
  [
    param('jobId')
      .notEmpty()
      .withMessage('Job ID is required')
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
      
      const { jobId } = req.params;
      const success = await dataPipelineService.triggerETLJob(jobId);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to trigger ETL job'
        });
      }
      
      loggingService.info('ETL job triggered manually', {
        userId: req.user?.id,
        jobId
      });
      
      res.json({
        success: true,
        message: `ETL job ${jobId} triggered successfully`
      });
    } catch (error) {
      loggingService.error('Failed to trigger ETL job', error, {
        userId: req.user?.id,
        jobId: req.params.jobId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to trigger ETL job'
      });
    }
  }
);

// Get aggregated metrics
router.get('/metrics',
  authMiddleware,
  [
    query('timeframe')
      .isIn(['hourly', 'daily', 'weekly', 'monthly'])
      .withMessage('Invalid timeframe'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { timeframe, startDate, endDate } = req.query;
      
      // Default to last 24 hours if no dates provided
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : 
                   new Date(end.getTime() - 24 * 60 * 60 * 1000);
      
      const metrics = await dataPipelineService.getAggregatedMetrics(
        timeframe as any,
        start,
        end
      );
      
      loggingService.info('Aggregated metrics requested', {
        userId: req.user?.id,
        timeframe,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        metricCount: metrics.length
      });
      
      res.json({
        success: true,
        data: metrics,
        count: metrics.length,
        parameters: {
          timeframe,
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get aggregated metrics', error, {
        userId: req.user?.id,
        timeframe: req.query.timeframe
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve aggregated metrics'
      });
    }
  }
);

// Get data quality report
router.get('/data-quality',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const report = await dataPipelineService.getDataQualityReport();
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'No data quality report available'
        });
      }
      
      loggingService.info('Data quality report requested', {
        userId: req.user?.id,
        overallScore: report.overallScore
      });
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get data quality report', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve data quality report'
      });
    }
  }
);

// Get pipeline health summary
router.get('/health',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const jobStatuses = await dataPipelineService.getETLJobStatus();
      const dataQualityReport = await dataPipelineService.getDataQualityReport();
      
      // Calculate pipeline health
      const runningJobs = jobStatuses.filter(job => job.status === 'running').length;
      const failedJobs = jobStatuses.filter(job => job.status === 'failed').length;
      const completedJobs = jobStatuses.filter(job => job.status === 'completed').length;
      
      const healthStatus = failedJobs === 0 ? 'healthy' : 
                          failedJobs <= 2 ? 'degraded' : 'unhealthy';
      
      const health = {
        status: healthStatus,
        summary: {
          totalJobs: jobStatuses.length,
          runningJobs,
          completedJobs,
          failedJobs
        },
        dataQuality: dataQualityReport ? {
          overallScore: dataQualityReport.overallScore,
          lastChecked: dataQualityReport.timestamp
        } : null,
        lastUpdated: new Date().toISOString()
      };
      
      loggingService.info('Pipeline health requested', {
        userId: req.user?.id,
        healthStatus,
        failedJobs,
        dataQualityScore: dataQualityReport?.overallScore
      });
      
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get pipeline health', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pipeline health'
      });
    }
  }
);

// Get pipeline statistics
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
      const jobStatuses = await dataPipelineService.getETLJobStatus();
      
      // Calculate statistics for the time period
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const recentJobs = jobStatuses.filter(job => 
        job.lastRun && new Date(job.lastRun) >= cutoffTime
      );
      
      const totalRecordsProcessed = recentJobs.reduce(
        (sum, job) => sum + job.recordsProcessed, 0
      );
      
      const totalErrors = recentJobs.reduce(
        (sum, job) => sum + job.errorCount, 0
      );
      
      const averageDuration = recentJobs.length > 0 ?
        recentJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / recentJobs.length :
        0;
      
      const stats = {
        timeframe: `${hours} hours`,
        jobsRun: recentJobs.length,
        totalRecordsProcessed,
        totalErrors,
        averageDuration: Math.round(averageDuration),
        successRate: recentJobs.length > 0 ?
          ((recentJobs.length - recentJobs.filter(j => j.status === 'failed').length) / recentJobs.length) * 100 :
          100,
        jobBreakdown: {
          completed: recentJobs.filter(j => j.status === 'completed').length,
          failed: recentJobs.filter(j => j.status === 'failed').length,
          running: recentJobs.filter(j => j.status === 'running').length
        }
      };
      
      loggingService.info('Pipeline statistics requested', {
        userId: req.user?.id,
        hours,
        jobsRun: stats.jobsRun,
        successRate: stats.successRate
      });
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      loggingService.error('Failed to get pipeline statistics', error, {
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pipeline statistics'
      });
    }
  }
);

export { router as dataPipelineRouter };
