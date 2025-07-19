import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RedisService } from './RedisService';
import { LoggingService } from './LoggingService';
import { Payment } from '../entities/Payment';
import { User } from '../entities/User';
import { YieldStrategy } from '../entities/YieldStrategy';

export interface BusinessMetrics {
  totalPayments: number;
  totalVolume: string;
  totalYieldGenerated: string;
  activeUsers: number;
  averagePaymentSize: string;
  platformRevenue: string;
  yieldDistribution: {
    userYield: string;
    merchantYield: string;
    protocolYield: string;
  };
  topStrategies: Array<{
    strategyId: string;
    name: string;
    volume: string;
    apy: number;
    usage: number;
  }>;
}

export interface PerformanceMetrics {
  apiResponseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRates: {
    overall: number;
    byEndpoint: Record<string, number>;
  };
  throughput: {
    requestsPerSecond: number;
    paymentsPerHour: number;
  };
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    databaseConnections: number;
  };
}

export interface UserAnalytics {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  userGrowthRate: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
  userSegments: {
    individuals: number;
    merchants: number;
    whales: number; // Users with >$10k volume
  };
  geographicDistribution: Record<string, number>;
}

export interface YieldAnalytics {
  totalValueLocked: string;
  averageYieldRate: number;
  yieldByStrategy: Array<{
    strategyId: string;
    name: string;
    tvl: string;
    apy: number;
    utilization: number;
  }>;
  yieldTrends: {
    daily: Array<{ date: string; yield: string }>;
    weekly: Array<{ week: string; yield: string }>;
    monthly: Array<{ month: string; yield: string }>;
  };
}

export interface RealTimeMetrics {
  activePayments: number;
  pendingTransactions: number;
  liveTradingVolume: string;
  systemLoad: {
    api: number;
    database: number;
    redis: number;
  };
  externalServiceStatus: Record<string, {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    errorRate: number;
  }>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(YieldStrategy)
    private yieldStrategyRepository: Repository<YieldStrategy>,
    private redisService: RedisService,
    private loggingService: LoggingService,
  ) {}

  async getBusinessMetrics(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<BusinessMetrics> {
    const cacheKey = `business_metrics:${timeframe}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const { startDate, endDate } = this.getTimeframe(timeframe);

    try {
      // Get payment metrics
      const payments = await this.paymentRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
          status: 'completed'
        }
      });

      const totalPayments = payments.length;
      const totalVolume = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toString();
      const totalYieldGenerated = payments.reduce((sum, p) => sum + parseFloat(p.actualYield || '0'), 0).toString();
      
      // Calculate yield distribution (70% user, 20% merchant, 10% protocol)
      const totalYield = parseFloat(totalYieldGenerated);
      const yieldDistribution = {
        userYield: (totalYield * 0.7).toString(),
        merchantYield: (totalYield * 0.2).toString(),
        protocolYield: (totalYield * 0.1).toString(),
      };

      // Platform revenue (10% of yield + any fees)
      const platformRevenue = yieldDistribution.protocolYield;

      // Get active users
      const activeUsers = await this.userRepository.count({
        where: {
          lastActiveAt: Between(startDate, endDate)
        }
      });

      // Average payment size
      const averagePaymentSize = totalPayments > 0 
        ? (parseFloat(totalVolume) / totalPayments).toString() 
        : '0';

      // Get top strategies
      const strategiesQuery = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.yieldStrategy', 'strategyId')
        .addSelect('COUNT(*)', 'usage')
        .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'volume')
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('payment.status = :status', { status: 'completed' })
        .groupBy('payment.yieldStrategy')
        .orderBy('volume', 'DESC')
        .limit(5)
        .getRawMany();

      // Enrich with strategy details
      const topStrategies = await Promise.all(
        strategiesQuery.map(async (s) => {
          const strategy = await this.yieldStrategyRepository.findOne({
            where: { id: s.strategyId }
          });
          return {
            strategyId: s.strategyId,
            name: strategy?.name || 'Unknown',
            volume: s.volume || '0',
            apy: strategy?.actualAPY || 0,
            usage: parseInt(s.usage)
          };
        })
      );

      const metrics: BusinessMetrics = {
        totalPayments,
        totalVolume,
        totalYieldGenerated,
        activeUsers,
        averagePaymentSize,
        platformRevenue,
        yieldDistribution,
        topStrategies
      };

      // Cache for 5 minutes
      await this.redisService.setex(cacheKey, 300, JSON.stringify(metrics));
      
      this.loggingService.info('Business metrics calculated', {
        timeframe,
        totalPayments,
        totalVolume,
        activeUsers
      });

      return metrics;
    } catch (error) {
      this.loggingService.error('Failed to calculate business metrics', error);
      throw new Error('Failed to calculate business metrics');
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheKey = 'performance_metrics';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Get API response time metrics from logs
      const responseTimeStats = await this.getResponseTimeStats();
      
      // Get error rates
      const errorRates = await this.getErrorRates();
      
      // Get throughput metrics
      const throughput = await this.getThroughputMetrics();
      
      // Get system health
      const systemHealth = await this.getSystemHealth();

      const metrics: PerformanceMetrics = {
        apiResponseTime: responseTimeStats,
        errorRates,
        throughput,
        systemHealth
      };

      // Cache for 1 minute
      await this.redisService.setex(cacheKey, 60, JSON.stringify(metrics));
      
      return metrics;
    } catch (error) {
      this.loggingService.error('Failed to calculate performance metrics', error);
      throw new Error('Failed to calculate performance metrics');
    }
  }

  async getUserAnalytics(timeframe: 'day' | 'week' | 'month' = 'month'): Promise<UserAnalytics> {
    const cacheKey = `user_analytics:${timeframe}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const { startDate, endDate } = this.getTimeframe(timeframe);
    const now = new Date();

    try {
      // Daily active users
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dailyActiveUsers = await this.userRepository.count({
        where: { lastActiveAt: Between(oneDayAgo, now) }
      });

      // Monthly active users
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthlyActiveUsers = await this.userRepository.count({
        where: { lastActiveAt: Between(monthAgo, now) }
      });

      // User growth rate
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const currentUsers = await this.userRepository.count({
        where: { createdAt: Between(startDate, endDate) }
      });
      const previousUsers = await this.userRepository.count({
        where: { createdAt: Between(previousPeriodStart, startDate) }
      });
      const userGrowthRate = previousUsers > 0 
        ? ((currentUsers - previousUsers) / previousUsers) * 100 
        : 0;

      // Retention rates (simplified calculation)
      const retentionRate = {
        day1: await this.calculateRetentionRate(1),
        day7: await this.calculateRetentionRate(7),
        day30: await this.calculateRetentionRate(30)
      };

      // User segments
      const individuals = await this.userRepository.count({
        where: { userType: 'individual' }
      });
      const merchants = await this.userRepository.count({
        where: { userType: 'merchant' }
      });
      
      // Whales (users with >$10k volume)
      const whaleQuery = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.sender', 'userId')
        .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'totalVolume')
        .where('payment.status = :status', { status: 'completed' })
        .groupBy('payment.sender')
        .having('SUM(CAST(payment.amount AS DECIMAL)) > :threshold', { threshold: 10000 })
        .getRawMany();
      const whales = whaleQuery.length;

      const userSegments = { individuals, merchants, whales };

      // Geographic distribution (mock data - would integrate with user location data)
      const geographicDistribution = {
        'United States': Math.floor(dailyActiveUsers * 0.4),
        'Europe': Math.floor(dailyActiveUsers * 0.3),
        'Asia': Math.floor(dailyActiveUsers * 0.2),
        'Other': Math.floor(dailyActiveUsers * 0.1)
      };

      const analytics: UserAnalytics = {
        dailyActiveUsers,
        monthlyActiveUsers,
        userGrowthRate,
        retentionRate,
        userSegments,
        geographicDistribution
      };

      // Cache for 10 minutes
      await this.redisService.setex(cacheKey, 600, JSON.stringify(analytics));
      
      return analytics;
    } catch (error) {
      this.loggingService.error('Failed to calculate user analytics', error);
      throw new Error('Failed to calculate user analytics');
    }
  }

  async getYieldAnalytics(): Promise<YieldAnalytics> {
    const cacheKey = 'yield_analytics';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Total Value Locked (sum of all active payments)
      const activePayments = await this.paymentRepository.find({
        where: { status: 'yielding' }
      });
      const totalValueLocked = activePayments
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)
        .toString();

      // Average yield rate across all strategies
      const strategies = await this.yieldStrategyRepository.find({ where: { isActive: true } });
      const averageYieldRate = strategies.length > 0 
        ? strategies.reduce((sum, s) => sum + s.actualAPY, 0) / strategies.length 
        : 0;

      // Yield by strategy
      const yieldByStrategy = await Promise.all(
        strategies.map(async (strategy) => {
          const strategyPayments = await this.paymentRepository.find({
            where: { 
              yieldStrategy: strategy.id,
              status: 'yielding'
            }
          });
          const tvl = strategyPayments
            .reduce((sum, p) => sum + parseFloat(p.amount), 0)
            .toString();
          const utilization = parseFloat(tvl) / parseFloat(strategy.totalValueLocked || '1') * 100;

          return {
            strategyId: strategy.id,
            name: strategy.name,
            tvl,
            apy: strategy.actualAPY,
            utilization: Math.min(utilization, 100)
          };
        })
      );

      // Yield trends (simplified - would use time-series data)
      const yieldTrends = {
        daily: await this.getYieldTrends('day', 7),
        weekly: await this.getYieldTrends('week', 4),
        monthly: await this.getYieldTrends('month', 12)
      };

      const analytics: YieldAnalytics = {
        totalValueLocked,
        averageYieldRate,
        yieldByStrategy,
        yieldTrends
      };

      // Cache for 5 minutes
      await this.redisService.setex(cacheKey, 300, JSON.stringify(analytics));
      
      return analytics;
    } catch (error) {
      this.loggingService.error('Failed to calculate yield analytics', error);
      throw new Error('Failed to calculate yield analytics');
    }
  }

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      // Active payments
      const activePayments = await this.paymentRepository.count({
        where: { status: 'yielding' }
      });

      // Pending transactions
      const pendingTransactions = await this.paymentRepository.count({
        where: { status: 'pending' }
      });

      // Live trading volume (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPayments = await this.paymentRepository.find({
        where: {
          createdAt: Between(oneDayAgo, new Date()),
          status: 'completed'
        }
      });
      const liveTradingVolume = recentPayments
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)
        .toString();

      // System load (mock data - would integrate with actual monitoring)
      const systemLoad = {
        api: Math.random() * 100,
        database: Math.random() * 100,
        redis: Math.random() * 100
      };

      // External service status (mock data - would integrate with health checks)
      const externalServiceStatus = {
        noble: {
          status: 'healthy' as const,
          responseTime: Math.random() * 100 + 50,
          errorRate: Math.random() * 5
        },
        resolv: {
          status: 'healthy' as const,
          responseTime: Math.random() * 100 + 50,
          errorRate: Math.random() * 5
        },
        aave: {
          status: 'healthy' as const,
          responseTime: Math.random() * 100 + 50,
          errorRate: Math.random() * 5
        },
        circle: {
          status: 'healthy' as const,
          responseTime: Math.random() * 100 + 50,
          errorRate: Math.random() * 5
        }
      };

      return {
        activePayments,
        pendingTransactions,
        liveTradingVolume,
        systemLoad,
        externalServiceStatus
      };
    } catch (error) {
      this.loggingService.error('Failed to get real-time metrics', error);
      throw new Error('Failed to get real-time metrics');
    }
  }

  // Helper methods
  private getTimeframe(timeframe: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private async getResponseTimeStats() {
    // Mock implementation - would integrate with actual monitoring
    return {
      average: Math.random() * 200 + 50,
      p95: Math.random() * 300 + 100,
      p99: Math.random() * 500 + 200
    };
  }

  private async getErrorRates() {
    // Mock implementation - would integrate with actual monitoring
    return {
      overall: Math.random() * 2,
      byEndpoint: {
        '/api/payments': Math.random() * 1,
        '/api/yield': Math.random() * 1,
        '/api/crosschain': Math.random() * 2,
        '/api/auth': Math.random() * 0.5
      }
    };
  }

  private async getThroughputMetrics() {
    // Mock implementation - would integrate with actual monitoring
    return {
      requestsPerSecond: Math.random() * 100 + 50,
      paymentsPerHour: Math.random() * 500 + 100
    };
  }

  private async getSystemHealth() {
    // Mock implementation - would integrate with actual system monitoring
    return {
      cpuUsage: Math.random() * 80 + 10,
      memoryUsage: Math.random() * 70 + 20,
      diskUsage: Math.random() * 60 + 30,
      databaseConnections: Math.floor(Math.random() * 50 + 10)
    };
  }

  private async calculateRetentionRate(days: number): Promise<number> {
    // Simplified retention calculation
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const usersCreated = await this.userRepository.count({
      where: { createdAt: Between(daysAgo, new Date(daysAgo.getTime() + 24 * 60 * 60 * 1000)) }
    });
    
    if (usersCreated === 0) return 0;
    
    const usersActive = await this.userRepository.count({
      where: {
        createdAt: Between(daysAgo, new Date(daysAgo.getTime() + 24 * 60 * 60 * 1000)),
        lastActiveAt: Between(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
      }
    });
    
    return (usersActive / usersCreated) * 100;
  }

  private async getYieldTrends(period: 'day' | 'week' | 'month', count: number) {
    const trends = [];
    const now = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
      let periodStart: Date;
      let periodEnd: Date;
      let label: string;
      
      if (period === 'day') {
        periodStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
        periodEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        label = periodStart.toISOString().split('T')[0];
      } else if (period === 'week') {
        periodStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        periodEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        label = `Week ${count - i}`;
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 1);
        label = periodStart.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      
      // Calculate yield for period
      const payments = await this.paymentRepository.find({
        where: {
          createdAt: Between(periodStart, periodEnd),
          status: 'completed'
        }
      });
      
      const periodYield = payments
        .reduce((sum, p) => sum + parseFloat(p.actualYield || '0'), 0)
        .toString();
      
      trends.push({
        [period === 'day' ? 'date' : period === 'week' ? 'week' : 'month']: label,
        yield: periodYield
      });
    }
    
    return trends;
  }

  // Public method to trigger analytics data refresh
  async refreshAnalyticsCache(): Promise<void> {
    try {
      await Promise.all([
        this.redisService.del('business_metrics:day'),
        this.redisService.del('business_metrics:week'),
        this.redisService.del('business_metrics:month'),
        this.redisService.del('business_metrics:year'),
        this.redisService.del('performance_metrics'),
        this.redisService.del('user_analytics:day'),
        this.redisService.del('user_analytics:week'),
        this.redisService.del('user_analytics:month'),
        this.redisService.del('yield_analytics')
      ]);
      
      this.loggingService.info('Analytics cache refreshed');
    } catch (error) {
      this.loggingService.error('Failed to refresh analytics cache', error);
      throw new Error('Failed to refresh analytics cache');
    }
  }
}
