import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from './RedisService';
import { LoggingService } from './LoggingService';
import { Payment } from '../entities/Payment';
import { User } from '../entities/User';
import { YieldStrategy } from '../entities/YieldStrategy';

export interface AggregatedMetrics {
  timestamp: Date;
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  metrics: {
    payments: {
      count: number;
      volume: string;
      averageSize: string;
      completionRate: number;
    };
    yield: {
      totalGenerated: string;
      averageRate: number;
      topStrategy: string;
    };
    users: {
      active: number;
      new: number;
      retention: number;
    };
    performance: {
      averageResponseTime: number;
      errorRate: number;
      throughput: number;
    };
  };
}

export interface DataQualityReport {
  timestamp: Date;
  checks: {
    completeness: {
      score: number;
      missingFields: string[];
    };
    accuracy: {
      score: number;
      inconsistencies: string[];
    };
    freshness: {
      score: number;
      staleDataSources: string[];
    };
    uniqueness: {
      score: number;
      duplicates: number;
    };
  };
  overallScore: number;
}

export interface ETLJobStatus {
  jobId: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  errorCount: number;
  lastRun?: Date;
  nextRun?: Date;
}

@Injectable()
export class DataPipelineService {
  private readonly ETL_JOBS = [
    { id: 'payment_aggregation', name: 'Payment Data Aggregation', schedule: '*/15 * * * *' }, // Every 15 minutes
    { id: 'user_analytics', name: 'User Analytics Processing', schedule: '0 */1 * * *' }, // Every hour
    { id: 'yield_metrics', name: 'Yield Metrics Calculation', schedule: '*/10 * * * *' }, // Every 10 minutes
    { id: 'performance_metrics', name: 'Performance Metrics Aggregation', schedule: '*/5 * * * *' }, // Every 5 minutes
    { id: 'data_quality_check', name: 'Data Quality Assessment', schedule: '0 0 */6 * * *' }, // Every 6 hours
    { id: 'cleanup_old_data', name: 'Data Cleanup and Archival', schedule: '0 2 * * *' } // Daily at 2 AM
  ];

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(YieldStrategy)
    private yieldStrategyRepository: Repository<YieldStrategy>,
    private redisService: RedisService,
    private loggingService: LoggingService
  ) {
    this.initializeETLJobs();
  }

  private async initializeETLJobs(): Promise<void> {
    for (const job of this.ETL_JOBS) {
      const statusKey = `etl_job_status:${job.id}`;
      const existingStatus = await this.redisService.get(statusKey);
      
      if (!existingStatus) {
        const initialStatus: ETLJobStatus = {
          jobId: job.id,
          name: job.name,
          status: 'pending',
          startTime: new Date(),
          recordsProcessed: 0,
          errorCount: 0
        };
        
        await this.redisService.set(statusKey, JSON.stringify(initialStatus));
      }
    }
    
    this.loggingService.info('ETL jobs initialized', { jobCount: this.ETL_JOBS.length });
  }

  // Payment Data Aggregation Job
  @Cron('*/15 * * * *') // Every 15 minutes
  async aggregatePaymentData(): Promise<void> {
    const jobId = 'payment_aggregation';
    await this.runETLJob(jobId, async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Aggregate hourly payment data
      const hourlyMetrics = await this.calculatePaymentMetrics(oneHourAgo, now, 'hourly');
      await this.storeAggregatedMetrics(hourlyMetrics);
      
      // Aggregate daily data (if it's a new day)
      if (now.getHours() === 0 && now.getMinutes() < 15) {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dailyMetrics = await this.calculatePaymentMetrics(oneDayAgo, now, 'daily');
        await this.storeAggregatedMetrics(dailyMetrics);
      }
      
      return { recordsProcessed: hourlyMetrics ? 1 : 0 };
    });
  }

  // User Analytics Processing Job
  @Cron('0 */1 * * *') // Every hour
  async processUserAnalytics(): Promise<void> {
    const jobId = 'user_analytics';
    await this.runETLJob(jobId, async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Calculate user engagement metrics
      const activeUsers = await this.userRepository.count({
        where: { lastActiveAt: Between(oneHourAgo, now) }
      });
      
      const newUsers = await this.userRepository.count({
        where: { createdAt: Between(oneHourAgo, now) }
      });
      
      // Store user metrics
      const userMetrics = {
        timestamp: now,
        timeframe: 'hourly' as const,
        activeUsers,
        newUsers,
        totalUsers: await this.userRepository.count()
      };
      
      await this.redisService.setex(
        `user_metrics:hourly:${now.toISOString().split('T')[0]}:${now.getHours()}`,
        86400, // 24 hours
        JSON.stringify(userMetrics)
      );
      
      return { recordsProcessed: 1 };
    });
  }

  // Yield Metrics Calculation Job
  @Cron('*/10 * * * *') // Every 10 minutes
  async calculateYieldMetrics(): Promise<void> {
    const jobId = 'yield_metrics';
    await this.runETLJob(jobId, async () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      // Calculate yield metrics for active payments
      const activePayments = await this.paymentRepository.find({
        where: { status: 'yielding' }
      });
      
      let totalYieldGenerated = 0;
      let recordsProcessed = 0;
      
      for (const payment of activePayments) {
        // Simulate yield calculation (in a real system, this would integrate with actual yield data)
        const strategy = await this.yieldStrategyRepository.findOne({
          where: { id: payment.yieldStrategy }
        });
        
        if (strategy) {
          const timeElapsed = (now.getTime() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365); // Years
          const yieldAmount = parseFloat(payment.amount) * (strategy.actualAPY / 100) * timeElapsed;
          totalYieldGenerated += yieldAmount;
          recordsProcessed++;
        }
      }
      
      // Store yield metrics
      const yieldMetrics = {
        timestamp: now,
        totalActivePayments: activePayments.length,
        totalYieldGenerated: totalYieldGenerated.toString(),
        averageYieldRate: activePayments.length > 0 ? totalYieldGenerated / activePayments.length : 0
      };
      
      await this.redisService.setex(
        `yield_metrics:${now.toISOString()}`,
        3600, // 1 hour
        JSON.stringify(yieldMetrics)
      );
      
      return { recordsProcessed };
    });
  }

  // Performance Metrics Aggregation Job
  @Cron('*/5 * * * *') // Every 5 minutes
  async aggregatePerformanceMetrics(): Promise<void> {
    const jobId = 'performance_metrics';
    await this.runETLJob(jobId, async () => {
      const now = new Date();
      
      // Collect performance metrics (mock data - would integrate with actual monitoring)
      const performanceMetrics = {
        timestamp: now,
        apiResponseTime: {
          average: Math.random() * 200 + 50,
          p95: Math.random() * 300 + 100,
          p99: Math.random() * 500 + 200
        },
        errorRate: Math.random() * 2,
        throughput: Math.random() * 100 + 50,
        systemHealth: {
          cpuUsage: Math.random() * 80 + 10,
          memoryUsage: Math.random() * 70 + 20,
          diskUsage: Math.random() * 60 + 30
        }
      };
      
      await this.redisService.setex(
        `performance_metrics:${now.toISOString()}`,
        1800, // 30 minutes
        JSON.stringify(performanceMetrics)
      );
      
      return { recordsProcessed: 1 };
    });
  }

  // Data Quality Check Job
  @Cron('0 0 */6 * * *') // Every 6 hours
  async runDataQualityCheck(): Promise<void> {
    const jobId = 'data_quality_check';
    await this.runETLJob(jobId, async () => {
      const report = await this.assessDataQuality();
      
      await this.redisService.setex(
        'data_quality_report',
        21600, // 6 hours
        JSON.stringify(report)
      );
      
      // Log data quality issues
      if (report.overallScore < 80) {
        this.loggingService.warn('Data quality score below threshold', {
          score: report.overallScore,
          issues: report.checks
        });
      }
      
      return { recordsProcessed: 1 };
    });
  }

  // Data Cleanup Job
  @Cron('0 2 * * *') // Daily at 2 AM
  async cleanupOldData(): Promise<void> {
    const jobId = 'cleanup_old_data';
    await this.runETLJob(jobId, async () => {
      const now = new Date();
      let recordsProcessed = 0;
      
      // Cleanup old analytics data from Redis
      const patterns = [
        'user_metrics:hourly:*',
        'yield_metrics:*',
        'performance_metrics:*',
        'aggregated_metrics:*'
      ];
      
      for (const pattern of patterns) {
        const keys = await this.redisService.keys(pattern);
        const cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        
        for (const key of keys) {
          const data = await this.redisService.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.timestamp && new Date(parsed.timestamp) < cutoffTime) {
              await this.redisService.del(key);
              recordsProcessed++;
            }
          }
        }
      }
      
      // Archive old payment data (in a real system, this would move data to cold storage)
      const oldPayments = await this.paymentRepository.find({
        where: {
          createdAt: Between(
            new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)   // 90 days ago
          ),
          status: 'completed'
        }
      });
      
      // In production, these would be moved to archive storage
      recordsProcessed += oldPayments.length;
      
      return { recordsProcessed };
    });
  }

  private async runETLJob(
    jobId: string,
    jobFunction: () => Promise<{ recordsProcessed: number }>
  ): Promise<void> {
    const statusKey = `etl_job_status:${jobId}`;
    const startTime = new Date();
    
    try {
      // Update job status to running
      const runningStatus: ETLJobStatus = {
        jobId,
        name: this.ETL_JOBS.find(j => j.id === jobId)?.name || jobId,
        status: 'running',
        startTime,
        recordsProcessed: 0,
        errorCount: 0
      };
      
      await this.redisService.set(statusKey, JSON.stringify(runningStatus));
      
      // Execute the job
      const result = await jobFunction();
      const endTime = new Date();
      
      // Update job status to completed
      const completedStatus: ETLJobStatus = {
        ...runningStatus,
        status: 'completed',
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        recordsProcessed: result.recordsProcessed,
        lastRun: endTime
      };
      
      await this.redisService.set(statusKey, JSON.stringify(completedStatus));
      
      this.loggingService.info('ETL job completed', {
        jobId,
        duration: completedStatus.duration,
        recordsProcessed: result.recordsProcessed
      });
      
    } catch (error) {
      const endTime = new Date();
      
      // Update job status to failed
      const failedStatus: ETLJobStatus = {
        jobId,
        name: this.ETL_JOBS.find(j => j.id === jobId)?.name || jobId,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        recordsProcessed: 0,
        errorCount: 1
      };
      
      await this.redisService.set(statusKey, JSON.stringify(failedStatus));
      
      this.loggingService.error('ETL job failed', error, { jobId });
    }
  }

  private async calculatePaymentMetrics(
    startTime: Date,
    endTime: Date,
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Promise<AggregatedMetrics | null> {
    try {
      const payments = await this.paymentRepository.find({
        where: {
          createdAt: Between(startTime, endTime)
        }
      });
      
      if (payments.length === 0) {
        return null;
      }
      
      const completedPayments = payments.filter(p => p.status === 'completed');
      const totalVolume = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalYield = completedPayments.reduce((sum, p) => sum + parseFloat(p.actualYield || '0'), 0);
      
      // Find most popular strategy
      const strategyCounts = payments.reduce((acc, p) => {
        acc[p.yieldStrategy] = (acc[p.yieldStrategy] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topStrategy = Object.entries(strategyCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
      
      const metrics: AggregatedMetrics = {
        timestamp: endTime,
        timeframe,
        metrics: {
          payments: {
            count: payments.length,
            volume: totalVolume.toString(),
            averageSize: payments.length > 0 ? (totalVolume / payments.length).toString() : '0',
            completionRate: payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 0
          },
          yield: {
            totalGenerated: totalYield.toString(),
            averageRate: completedPayments.length > 0 ? totalYield / completedPayments.length : 0,
            topStrategy
          },
          users: {
            active: await this.userRepository.count({
              where: { lastActiveAt: Between(startTime, endTime) }
            }),
            new: await this.userRepository.count({
              where: { createdAt: Between(startTime, endTime) }
            }),
            retention: 0 // Would need more complex calculation
          },
          performance: {
            averageResponseTime: Math.random() * 200 + 50, // Mock data
            errorRate: Math.random() * 2,
            throughput: payments.length / ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) // per hour
          }
        }
      };
      
      return metrics;
    } catch (error) {
      this.loggingService.error('Failed to calculate payment metrics', error);
      return null;
    }
  }

  private async storeAggregatedMetrics(metrics: AggregatedMetrics): Promise<void> {
    if (!metrics) return;
    
    const key = `aggregated_metrics:${metrics.timeframe}:${metrics.timestamp.toISOString()}`;
    const ttl = metrics.timeframe === 'hourly' ? 86400 : // 24 hours
                metrics.timeframe === 'daily' ? 2592000 : // 30 days
                metrics.timeframe === 'weekly' ? 7776000 : // 90 days
                31536000; // 365 days
    
    await this.redisService.setex(key, ttl, JSON.stringify(metrics));
  }

  private async assessDataQuality(): Promise<DataQualityReport> {
    const timestamp = new Date();
    
    // Check data completeness
    const totalPayments = await this.paymentRepository.count();
    const paymentsWithAmount = await this.paymentRepository.count({
      where: { amount: MoreThan('0') }
    });
    const completenessScore = totalPayments > 0 ? (paymentsWithAmount / totalPayments) * 100 : 100;
    
    // Check data accuracy (mock implementation)
    const accuracyScore = 95 + Math.random() * 5; // 95-100%
    
    // Check data freshness
    const recentData = await this.paymentRepository.count({
      where: { createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) }
    });
    const freshnessScore = recentData > 0 ? 100 : 50;
    
    // Check data uniqueness (simplified)
    const uniquenessScore = 98 + Math.random() * 2; // 98-100%
    
    const checks = {
      completeness: {
        score: completenessScore,
        missingFields: completenessScore < 100 ? ['amount'] : []
      },
      accuracy: {
        score: accuracyScore,
        inconsistencies: accuracyScore < 95 ? ['payment_status_mismatch'] : []
      },
      freshness: {
        score: freshnessScore,
        staleDataSources: freshnessScore < 90 ? ['external_yield_data'] : []
      },
      uniqueness: {
        score: uniquenessScore,
        duplicates: uniquenessScore < 99 ? Math.floor((100 - uniquenessScore) * 10) : 0
      }
    };
    
    const overallScore = (checks.completeness.score + checks.accuracy.score + 
                         checks.freshness.score + checks.uniqueness.score) / 4;
    
    return {
      timestamp,
      checks,
      overallScore
    };
  }

  // Public methods for API access
  async getETLJobStatus(jobId?: string): Promise<ETLJobStatus[]> {
    try {
      if (jobId) {
        const statusKey = `etl_job_status:${jobId}`;
        const status = await this.redisService.get(statusKey);
        return status ? [JSON.parse(status)] : [];
      }
      
      const statuses: ETLJobStatus[] = [];
      for (const job of this.ETL_JOBS) {
        const statusKey = `etl_job_status:${job.id}`;
        const status = await this.redisService.get(statusKey);
        if (status) {
          statuses.push(JSON.parse(status));
        }
      }
      
      return statuses;
    } catch (error) {
      this.loggingService.error('Failed to get ETL job status', error);
      return [];
    }
  }

  async getAggregatedMetrics(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<AggregatedMetrics[]> {
    try {
      const pattern = `aggregated_metrics:${timeframe}:*`;
      const keys = await this.redisService.keys(pattern);
      const metrics: AggregatedMetrics[] = [];
      
      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const metric: AggregatedMetrics = JSON.parse(data);
          const metricTime = new Date(metric.timestamp);
          
          if (metricTime >= startDate && metricTime <= endDate) {
            metrics.push(metric);
          }
        }
      }
      
      return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      this.loggingService.error('Failed to get aggregated metrics', error);
      return [];
    }
  }

  async getDataQualityReport(): Promise<DataQualityReport | null> {
    try {
      const report = await this.redisService.get('data_quality_report');
      return report ? JSON.parse(report) : null;
    } catch (error) {
      this.loggingService.error('Failed to get data quality report', error);
      return null;
    }
  }

  async triggerETLJob(jobId: string): Promise<boolean> {
    try {
      const job = this.ETL_JOBS.find(j => j.id === jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Execute the job based on its ID
      switch (jobId) {
        case 'payment_aggregation':
          await this.aggregatePaymentData();
          break;
        case 'user_analytics':
          await this.processUserAnalytics();
          break;
        case 'yield_metrics':
          await this.calculateYieldMetrics();
          break;
        case 'performance_metrics':
          await this.aggregatePerformanceMetrics();
          break;
        case 'data_quality_check':
          await this.runDataQualityCheck();
          break;
        case 'cleanup_old_data':
          await this.cleanupOldData();
          break;
        default:
          throw new Error(`Unknown job: ${jobId}`);
      }
      
      return true;
    } catch (error) {
      this.loggingService.error('Failed to trigger ETL job', error, { jobId });
      return false;
    }
  }
}
