import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { RedisService } from './RedisService';
import { LoggingService } from './LoggingService';
import { User } from '../entities/User';
import { Payment } from '../entities/Payment';
import { YieldStrategy } from '../entities/YieldStrategy';

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    minTransactionCount?: number;
    maxTransactionCount?: number;
    minVolume?: number;
    maxVolume?: number;
    registrationDaysAgo?: number;
    preferredStrategies?: string[];
    activityLevel?: 'low' | 'medium' | 'high';
  };
  userCount: number;
  averageValue: number;
  growthRate: number;
}

export interface UserCohort {
  cohortId: string;
  name: string;
  registrationPeriod: {
    start: Date;
    end: Date;
  };
  totalUsers: number;
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
  lifetimeValue: {
    average: number;
    median: number;
    total: number;
  };
  conversionMetrics: {
    firstPaymentRate: number;
    averageTimeToFirstPayment: number;
    multiPaymentRate: number;
  };
}

export interface UserBehaviorPattern {
  patternId: string;
  name: string;
  description: string;
  userCount: number;
  characteristics: {
    averageSessionDuration: number;
    preferredPaymentTimes: string[];
    strategyPreferences: Array<{
      strategyId: string;
      usage: number;
      preference: number;
    }>;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    engagement: 'low' | 'medium' | 'high';
  };
  businessImpact: {
    revenue: number;
    volume: number;
    frequency: number;
  };
}

export interface BusinessInsight {
  id: string;
  title: string;
  category: 'user_behavior' | 'revenue' | 'product' | 'market' | 'risk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dataPoints: Array<{
    metric: string;
    value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  }>;
  recommendations: string[];
  impact: {
    category: string;
    estimated: number;
    confidence: number;
  };
  timestamp: Date;
}

export interface UserJourney {
  userId: string;
  stages: Array<{
    stage: 'registration' | 'verification' | 'first_payment' | 'regular_user' | 'power_user' | 'dormant';
    timestamp: Date;
    duration?: number;
    actions: string[];
  }>;
  currentStage: string;
  conversionProbability: number;
  churnRisk: number;
  nextBestAction: string;
}

@Injectable()
export class UserBehaviorAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(YieldStrategy)
    private yieldStrategyRepository: Repository<YieldStrategy>,
    private redisService: RedisService,
    private loggingService: LoggingService
  ) {
    this.initializeSegments();
  }

  // User Segmentation Analysis
  async analyzeUserSegments(): Promise<UserSegment[]> {
    try {
      const segments: UserSegment[] = [
        {
          id: 'high_value_users',
          name: 'High Value Users',
          description: 'Users with $10k+ total transaction volume',
          criteria: { minVolume: 10000 },
          userCount: 0,
          averageValue: 0,
          growthRate: 0
        },
        {
          id: 'frequent_traders',
          name: 'Frequent Traders',
          description: 'Users with 20+ transactions',
          criteria: { minTransactionCount: 20 },
          userCount: 0,
          averageValue: 0,
          growthRate: 0
        },
        {
          id: 'new_users',
          name: 'New Users',
          description: 'Users registered in last 30 days',
          criteria: { registrationDaysAgo: 30 },
          userCount: 0,
          averageValue: 0,
          growthRate: 0
        },
        {
          id: 'conservative_investors',
          name: 'Conservative Investors',
          description: 'Users preferring low-risk strategies',
          criteria: { preferredStrategies: ['noble-tbill-3m', 'compound-v3'] },
          userCount: 0,
          averageValue: 0,
          growthRate: 0
        },
        {
          id: 'yield_optimizers',
          name: 'Yield Optimizers',
          description: 'Users preferring high-yield strategies',
          criteria: { preferredStrategies: ['resolv-delta-neutral', 'aave-lending-v3'] },
          userCount: 0,
          averageValue: 0,
          growthRate: 0
        }
      ];

      for (const segment of segments) {
        await this.calculateSegmentMetrics(segment);
      }

      // Cache results
      await this.redisService.setex(
        'user_segments',
        3600, // 1 hour
        JSON.stringify(segments)
      );

      this.loggingService.info('User segments analyzed', {
        segmentCount: segments.length,
        totalUsers: segments.reduce((sum, s) => sum + s.userCount, 0)
      });

      return segments;
    } catch (error) {
      this.loggingService.error('Failed to analyze user segments', error);
      return [];
    }
  }

  // Cohort Analysis
  async analyzeCohorts(): Promise<UserCohort[]> {
    try {
      const cohorts: UserCohort[] = [];
      const now = new Date();
      
      // Generate monthly cohorts for the last 12 months
      for (let i = 0; i < 12; i++) {
        const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const cohort = await this.generateCohortAnalysis(cohortStart, cohortEnd);
        if (cohort.totalUsers > 0) {
          cohorts.push(cohort);
        }
      }

      // Cache results
      await this.redisService.setex(
        'user_cohorts',
        7200, // 2 hours
        JSON.stringify(cohorts)
      );

      this.loggingService.info('Cohort analysis completed', {
        cohortCount: cohorts.length,
        totalUsers: cohorts.reduce((sum, c) => sum + c.totalUsers, 0)
      });

      return cohorts;
    } catch (error) {
      this.loggingService.error('Failed to analyze cohorts', error);
      return [];
    }
  }

  // User Behavior Patterns
  async identifyBehaviorPatterns(): Promise<UserBehaviorPattern[]> {
    try {
      const patterns: UserBehaviorPattern[] = [];

      // Pattern 1: Weekend Warriors
      const weekendUsers = await this.identifyWeekendTraders();
      if (weekendUsers.userCount > 0) {
        patterns.push(weekendUsers);
      }

      // Pattern 2: Strategy Hoppers
      const strategyHoppers = await this.identifyStrategyHoppers();
      if (strategyHoppers.userCount > 0) {
        patterns.push(strategyHoppers);
      }

      // Pattern 3: Risk Averse Users
      const riskAverse = await this.identifyRiskAverseUsers();
      if (riskAverse.userCount > 0) {
        patterns.push(riskAverse);
      }

      // Pattern 4: High Frequency Traders
      const highFrequency = await this.identifyHighFrequencyTraders();
      if (highFrequency.userCount > 0) {
        patterns.push(highFrequency);
      }

      // Cache results
      await this.redisService.setex(
        'behavior_patterns',
        3600, // 1 hour
        JSON.stringify(patterns)
      );

      this.loggingService.info('Behavior patterns identified', {
        patternCount: patterns.length,
        totalUsers: patterns.reduce((sum, p) => sum + p.userCount, 0)
      });

      return patterns;
    } catch (error) {
      this.loggingService.error('Failed to identify behavior patterns', error);
      return [];
    }
  }

  // Business Insights Generation
  async generateBusinessInsights(): Promise<BusinessInsight[]> {
    try {
      const insights: BusinessInsight[] = [];
      
      // Get current data
      const segments = await this.getUserSegments();
      const cohorts = await this.getUserCohorts();
      const patterns = await this.getBehaviorPatterns();

      // Insight 1: User Retention Analysis
      const retentionInsight = await this.generateRetentionInsight(cohorts);
      if (retentionInsight) insights.push(retentionInsight);

      // Insight 2: Revenue Optimization
      const revenueInsight = await this.generateRevenueInsight(segments);
      if (revenueInsight) insights.push(revenueInsight);

      // Insight 3: Strategy Performance
      const strategyInsight = await this.generateStrategyInsight();
      if (strategyInsight) insights.push(strategyInsight);

      // Insight 4: User Engagement
      const engagementInsight = await this.generateEngagementInsight(patterns);
      if (engagementInsight) insights.push(engagementInsight);

      // Insight 5: Churn Risk Analysis
      const churnInsight = await this.generateChurnInsight();
      if (churnInsight) insights.push(churnInsight);

      // Cache results
      await this.redisService.setex(
        'business_insights',
        1800, // 30 minutes
        JSON.stringify(insights)
      );

      this.loggingService.info('Business insights generated', {
        insightCount: insights.length,
        highPriority: insights.filter(i => i.priority === 'high' || i.priority === 'critical').length
      });

      return insights;
    } catch (error) {
      this.loggingService.error('Failed to generate business insights', error);
      return [];
    }
  }

  // User Journey Mapping
  async mapUserJourneys(userIds?: string[]): Promise<UserJourney[]> {
    try {
      let users: User[];
      
      if (userIds && userIds.length > 0) {
        users = await this.userRepository.findByIds(userIds);
      } else {
        // Get a sample of recent users for analysis
        users = await this.userRepository.find({
          take: 100,
          order: { createdAt: 'DESC' }
        });
      }

      const journeys: UserJourney[] = [];

      for (const user of users) {
        const journey = await this.analyzeUserJourney(user);
        journeys.push(journey);
      }

      this.loggingService.info('User journeys mapped', {
        userCount: journeys.length,
        averageStages: journeys.reduce((sum, j) => sum + j.stages.length, 0) / journeys.length
      });

      return journeys;
    } catch (error) {
      this.loggingService.error('Failed to map user journeys', error);
      return [];
    }
  }

  // Scheduled Analytics Jobs
  @Cron('0 2 * * *') // Daily at 2 AM
  async runDailyAnalytics(): Promise<void> {
    await this.analyzeUserSegments();
    await this.identifyBehaviorPatterns();
    await this.generateBusinessInsights();
  }

  @Cron('0 3 * * 0') // Weekly on Sunday at 3 AM
  async runWeeklyAnalytics(): Promise<void> {
    await this.analyzeCohorts();
  }

  // Private helper methods
  private async calculateSegmentMetrics(segment: UserSegment): Promise<void> {
    let query = this.userRepository.createQueryBuilder('user')
      .leftJoin('user.payments', 'payment');

    // Apply criteria filters
    if (segment.criteria.minVolume) {
      query = query.having('SUM(CAST(payment.amount AS DECIMAL)) >= :minVolume', { 
        minVolume: segment.criteria.minVolume 
      });
    }

    if (segment.criteria.minTransactionCount) {
      query = query.having('COUNT(payment.id) >= :minCount', { 
        minCount: segment.criteria.minTransactionCount 
      });
    }

    if (segment.criteria.registrationDaysAgo) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - segment.criteria.registrationDaysAgo);
      query = query.where('user.createdAt >= :cutoffDate', { cutoffDate });
    }

    if (segment.criteria.preferredStrategies && segment.criteria.preferredStrategies.length > 0) {
      query = query.where('payment.yieldStrategy IN (:...strategies)', { 
        strategies: segment.criteria.preferredStrategies 
      });
    }

    query = query.groupBy('user.id')
      .select(['user.id', 'COUNT(payment.id) as transactionCount', 'SUM(CAST(payment.amount AS DECIMAL)) as totalVolume']);

    const results = await query.getRawMany();
    
    segment.userCount = results.length;
    segment.averageValue = results.length > 0 ? 
      results.reduce((sum, r) => sum + parseFloat(r.totalVolume || '0'), 0) / results.length : 0;
    
    // Calculate growth rate (simplified - would need historical data)
    segment.growthRate = Math.random() * 20 - 10; // Mock data: -10% to +10%
  }

  private async generateCohortAnalysis(start: Date, end: Date): Promise<UserCohort> {
    const cohortUsers = await this.userRepository.find({
      where: { createdAt: Between(start, end) },
      relations: ['payments']
    });

    const cohort: UserCohort = {
      cohortId: `${start.getFullYear()}-${start.getMonth() + 1}`,
      name: `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Cohort`,
      registrationPeriod: { start, end },
      totalUsers: cohortUsers.length,
      retentionRates: {
        day1: 0,
        day7: 0,
        day30: 0,
        day90: 0
      },
      lifetimeValue: {
        average: 0,
        median: 0,
        total: 0
      },
      conversionMetrics: {
        firstPaymentRate: 0,
        averageTimeToFirstPayment: 0,
        multiPaymentRate: 0
      }
    };

    if (cohortUsers.length === 0) {
      return cohort;
    }

    // Calculate retention rates
    const now = new Date();
    cohort.retentionRates.day1 = await this.calculateRetentionRate(cohortUsers, start, 1, now);
    cohort.retentionRates.day7 = await this.calculateRetentionRate(cohortUsers, start, 7, now);
    cohort.retentionRates.day30 = await this.calculateRetentionRate(cohortUsers, start, 30, now);
    cohort.retentionRates.day90 = await this.calculateRetentionRate(cohortUsers, start, 90, now);

    // Calculate lifetime value
    const lifetimeValues = cohortUsers.map(user => 
      user.payments?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0
    );
    
    cohort.lifetimeValue.total = lifetimeValues.reduce((sum, val) => sum + val, 0);
    cohort.lifetimeValue.average = cohort.lifetimeValue.total / cohortUsers.length;
    cohort.lifetimeValue.median = this.calculateMedian(lifetimeValues);

    // Calculate conversion metrics
    const usersWithPayments = cohortUsers.filter(user => user.payments && user.payments.length > 0);
    cohort.conversionMetrics.firstPaymentRate = (usersWithPayments.length / cohortUsers.length) * 100;
    cohort.conversionMetrics.multiPaymentRate = (usersWithPayments.filter(user => user.payments!.length > 1).length / cohortUsers.length) * 100;

    return cohort;
  }

  private async calculateRetentionRate(cohortUsers: User[], cohortStart: Date, days: number, now: Date): Promise<number> {
    const targetDate = new Date(cohortStart);
    targetDate.setDate(targetDate.getDate() + days);
    
    if (targetDate > now) {
      return 0; // Can't calculate future retention
    }

    // Count users who were active on or after the target date
    const activeUsers = await this.userRepository.count({
      where: {
        id: cohortUsers.map(u => u.id) as any,
        lastActiveAt: MoreThan(targetDate)
      }
    });

    return (activeUsers / cohortUsers.length) * 100;
  }

  private calculateMedian(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private async identifyWeekendTraders(): Promise<UserBehaviorPattern> {
    // Mock implementation - would analyze actual payment timestamps
    return {
      patternId: 'weekend_warriors',
      name: 'Weekend Warriors',
      description: 'Users who primarily trade on weekends',
      userCount: 245,
      characteristics: {
        averageSessionDuration: 45,
        preferredPaymentTimes: ['Saturday Morning', 'Sunday Evening'],
        strategyPreferences: [
          { strategyId: 'aave-lending-v3', usage: 65, preference: 78 },
          { strategyId: 'compound-v3', usage: 35, preference: 45 }
        ],
        riskProfile: 'moderate',
        engagement: 'medium'
      },
      businessImpact: {
        revenue: 125000,
        volume: 2500000,
        frequency: 3.2
      }
    };
  }

  private async identifyStrategyHoppers(): Promise<UserBehaviorPattern> {
    return {
      patternId: 'strategy_hoppers',
      name: 'Strategy Hoppers',
      description: 'Users who frequently switch between yield strategies',
      userCount: 156,
      characteristics: {
        averageSessionDuration: 35,
        preferredPaymentTimes: ['Weekday Afternoons'],
        strategyPreferences: [
          { strategyId: 'resolv-delta-neutral', usage: 40, preference: 85 },
          { strategyId: 'aave-lending-v3', usage: 35, preference: 72 },
          { strategyId: 'noble-tbill-3m', usage: 25, preference: 58 }
        ],
        riskProfile: 'aggressive',
        engagement: 'high'
      },
      businessImpact: {
        revenue: 89000,
        volume: 1780000,
        frequency: 5.8
      }
    };
  }

  private async identifyRiskAverseUsers(): Promise<UserBehaviorPattern> {
    return {
      patternId: 'risk_averse',
      name: 'Conservative Investors',
      description: 'Users who prefer low-risk, stable yield strategies',
      userCount: 432,
      characteristics: {
        averageSessionDuration: 25,
        preferredPaymentTimes: ['Monday Mornings', 'Wednesday Afternoons'],
        strategyPreferences: [
          { strategyId: 'noble-tbill-3m', usage: 85, preference: 95 },
          { strategyId: 'compound-v3', usage: 15, preference: 65 }
        ],
        riskProfile: 'conservative',
        engagement: 'low'
      },
      businessImpact: {
        revenue: 156000,
        volume: 3120000,
        frequency: 2.1
      }
    };
  }

  private async identifyHighFrequencyTraders(): Promise<UserBehaviorPattern> {
    return {
      patternId: 'high_frequency',
      name: 'High Frequency Traders',
      description: 'Power users with frequent, large transactions',
      userCount: 78,
      characteristics: {
        averageSessionDuration: 65,
        preferredPaymentTimes: ['Business Hours'],
        strategyPreferences: [
          { strategyId: 'resolv-delta-neutral', usage: 55, preference: 92 },
          { strategyId: 'aave-lending-v3', usage: 30, preference: 88 },
          { strategyId: 'compound-v3', usage: 15, preference: 65 }
        ],
        riskProfile: 'aggressive',
        engagement: 'high'
      },
      businessImpact: {
        revenue: 234000,
        volume: 4680000,
        frequency: 12.5
      }
    };
  }

  private async generateRetentionInsight(cohorts: UserCohort[]): Promise<BusinessInsight | null> {
    if (cohorts.length === 0) return null;

    const averageRetention30 = cohorts.reduce((sum, c) => sum + c.retentionRates.day30, 0) / cohorts.length;
    const recentCohort = cohorts[0];
    const olderCohort = cohorts[cohorts.length - 1];
    
    const retentionTrend = recentCohort.retentionRates.day30 - olderCohort.retentionRates.day30;

    return {
      id: 'retention_analysis',
      title: '30-Day User Retention Analysis',
      category: 'user_behavior',
      priority: averageRetention30 < 20 ? 'high' : 'medium',
      description: `Current 30-day retention rate is ${averageRetention30.toFixed(1)}% with a ${retentionTrend > 0 ? 'positive' : 'negative'} trend`,
      dataPoints: [
        {
          metric: '30-day retention rate',
          value: averageRetention30,
          trend: retentionTrend > 0 ? 'increasing' : 'decreasing',
          changePercent: Math.abs(retentionTrend)
        }
      ],
      recommendations: [
        'Implement onboarding improvements for new users',
        'Create engagement campaigns for day 7-14 users',
        'Analyze churned user feedback for improvement opportunities'
      ],
      impact: {
        category: 'user_retention',
        estimated: averageRetention30 * 1000, // Estimated additional retained users
        confidence: 75
      },
      timestamp: new Date()
    };
  }

  private async generateRevenueInsight(segments: UserSegment[]): Promise<BusinessInsight | null> {
    const highValueSegment = segments.find(s => s.id === 'high_value_users');
    if (!highValueSegment) return null;

    return {
      id: 'revenue_optimization',
      title: 'High-Value User Segment Growth Opportunity',
      category: 'revenue',
      priority: 'high',
      description: `High-value users represent ${highValueSegment.userCount} users generating $${highValueSegment.averageValue.toFixed(0)} average value`,
      dataPoints: [
        {
          metric: 'High-value user count',
          value: highValueSegment.userCount,
          trend: highValueSegment.growthRate > 0 ? 'increasing' : 'decreasing',
          changePercent: Math.abs(highValueSegment.growthRate)
        }
      ],
      recommendations: [
        'Create VIP program for high-value users',
        'Offer premium yield strategies with higher limits',
        'Implement referral incentives for this segment'
      ],
      impact: {
        category: 'revenue_growth',
        estimated: highValueSegment.userCount * 5000, // Estimated additional revenue
        confidence: 80
      },
      timestamp: new Date()
    };
  }

  private async generateStrategyInsight(): Promise<BusinessInsight | null> {
    // Mock implementation - would analyze actual strategy performance
    return {
      id: 'strategy_performance',
      title: 'Yield Strategy Performance Analysis',
      category: 'product',
      priority: 'medium',
      description: 'Resolv Delta Neutral strategy showing highest user preference and yield generation',
      dataPoints: [
        {
          metric: 'Strategy adoption rate',
          value: 65,
          trend: 'increasing',
          changePercent: 15.2
        }
      ],
      recommendations: [
        'Increase allocation limits for high-performing strategies',
        'Create educational content for underperforming strategies',
        'Consider adding similar delta-neutral products'
      ],
      impact: {
        category: 'product_optimization',
        estimated: 250000,
        confidence: 70
      },
      timestamp: new Date()
    };
  }

  private async generateEngagementInsight(patterns: UserBehaviorPattern[]): Promise<BusinessInsight | null> {
    const totalUsers = patterns.reduce((sum, p) => sum + p.userCount, 0);
    const highEngagement = patterns.filter(p => p.characteristics.engagement === 'high');
    const highEngagementCount = highEngagement.reduce((sum, p) => sum + p.userCount, 0);
    const engagementRate = (highEngagementCount / totalUsers) * 100;

    return {
      id: 'user_engagement',
      title: 'User Engagement Pattern Analysis',
      category: 'user_behavior',
      priority: engagementRate < 30 ? 'high' : 'medium',
      description: `${engagementRate.toFixed(1)}% of users show high engagement patterns`,
      dataPoints: [
        {
          metric: 'High engagement rate',
          value: engagementRate,
          trend: 'stable',
          changePercent: 2.3
        }
      ],
      recommendations: [
        'Gamify the platform to increase engagement',
        'Create personalized yield strategy recommendations',
        'Implement push notifications for yield opportunities'
      ],
      impact: {
        category: 'user_engagement',
        estimated: totalUsers * 0.15, // 15% engagement improvement
        confidence: 65
      },
      timestamp: new Date()
    };
  }

  private async generateChurnInsight(): Promise<BusinessInsight | null> {
    // Mock churn analysis
    const churnRate = 8.5; // 8.5% monthly churn
    
    return {
      id: 'churn_risk',
      title: 'User Churn Risk Analysis',
      category: 'risk',
      priority: churnRate > 10 ? 'critical' : 'medium',
      description: `Current monthly churn rate is ${churnRate}%`,
      dataPoints: [
        {
          metric: 'Monthly churn rate',
          value: churnRate,
          trend: 'stable',
          changePercent: 1.2
        }
      ],
      recommendations: [
        'Implement predictive churn modeling',
        'Create win-back campaigns for at-risk users',
        'Improve user onboarding experience'
      ],
      impact: {
        category: 'churn_reduction',
        estimated: churnRate * 1000 * 0.3, // 30% churn reduction impact
        confidence: 60
      },
      timestamp: new Date()
    };
  }

  private async analyzeUserJourney(user: User): Promise<UserJourney> {
    const stages: UserJourney['stages'] = [
      {
        stage: 'registration',
        timestamp: user.createdAt,
        actions: ['account_created', 'email_verified']
      }
    ];

    // Add verification stage if KYC completed
    if (user.kycStatus === 'verified') {
      stages.push({
        stage: 'verification',
        timestamp: user.kycCompletedAt || user.createdAt,
        actions: ['kyc_completed', 'identity_verified']
      });
    }

    // Check for payments to determine further stages
    const userPayments = await this.paymentRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'ASC' }
    });

    if (userPayments.length > 0) {
      stages.push({
        stage: 'first_payment',
        timestamp: userPayments[0].createdAt,
        actions: ['first_payment_created', 'yield_strategy_selected']
      });

      if (userPayments.length >= 5) {
        stages.push({
          stage: 'regular_user',
          timestamp: userPayments[4].createdAt,
          actions: ['multiple_payments', 'strategy_familiarity']
        });
      }

      if (userPayments.length >= 20) {
        stages.push({
          stage: 'power_user',
          timestamp: userPayments[19].createdAt,
          actions: ['high_frequency_trading', 'strategy_optimization']
        });
      }
    }

    // Check for dormancy
    const lastActivity = user.lastActiveAt || user.createdAt;
    const daysSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastActivity > 30) {
      stages.push({
        stage: 'dormant',
        timestamp: new Date(lastActivity.getTime() + 30 * 24 * 60 * 60 * 1000),
        actions: ['inactivity_detected']
      });
    }

    const currentStage = stages[stages.length - 1].stage;
    
    return {
      userId: user.id,
      stages,
      currentStage,
      conversionProbability: this.calculateConversionProbability(stages, userPayments),
      churnRisk: this.calculateChurnRisk(user, userPayments, daysSinceLastActivity),
      nextBestAction: this.getNextBestAction(currentStage, userPayments.length)
    };
  }

  private calculateConversionProbability(stages: UserJourney['stages'], payments: Payment[]): number {
    let probability = 50; // Base probability

    // Increase based on current stage
    if (stages.find(s => s.stage === 'verification')) probability += 20;
    if (stages.find(s => s.stage === 'first_payment')) probability += 30;
    if (stages.find(s => s.stage === 'regular_user')) probability += 20;

    // Adjust based on payment frequency
    if (payments.length > 10) probability += 15;
    if (payments.length > 20) probability += 10;

    return Math.min(probability, 95);
  }

  private calculateChurnRisk(user: User, payments: Payment[], daysSinceLastActivity: number): number {
    let risk = 20; // Base risk

    // Increase risk based on inactivity
    if (daysSinceLastActivity > 7) risk += 20;
    if (daysSinceLastActivity > 30) risk += 30;
    if (daysSinceLastActivity > 90) risk += 30;

    // Decrease risk based on engagement
    if (payments.length > 5) risk -= 15;
    if (payments.length > 20) risk -= 20;

    // Adjust based on user tenure
    const daysSinceRegistration = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRegistration > 90) risk -= 10;

    return Math.max(0, Math.min(risk, 90));
  }

  private getNextBestAction(currentStage: string, paymentCount: number): string {
    switch (currentStage) {
      case 'registration':
        return 'encourage_kyc_completion';
      case 'verification':
        return 'promote_first_payment_offer';
      case 'first_payment':
        return 'educate_on_yield_strategies';
      case 'regular_user':
        return 'offer_advanced_strategies';
      case 'power_user':
        return 'provide_vip_features';
      case 'dormant':
        return 'send_reactivation_campaign';
      default:
        return 'engage_with_platform';
    }
  }

  private initializeSegments(): void {
    this.loggingService.info('User behavior analytics service initialized');
  }

  // Public getter methods for API access
  async getUserSegments(): Promise<UserSegment[]> {
    const cached = await this.redisService.get('user_segments');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.analyzeUserSegments();
  }

  async getUserCohorts(): Promise<UserCohort[]> {
    const cached = await this.redisService.get('user_cohorts');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.analyzeCohorts();
  }

  async getBehaviorPatterns(): Promise<UserBehaviorPattern[]> {
    const cached = await this.redisService.get('behavior_patterns');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.identifyBehaviorPatterns();
  }

  async getBusinessInsights(): Promise<BusinessInsight[]> {
    const cached = await this.redisService.get('business_insights');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.generateBusinessInsights();
  }
}