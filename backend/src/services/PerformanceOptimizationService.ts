import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { RedisService } from './RedisService';
import { LoggingService } from './LoggingService';
import { AnalyticsService } from './AnalyticsService';
import { AlertingService, AlertSeverity, AlertCategory } from './AlertingService';

export interface PerformanceMetric {
  timestamp: Date;
  metricType: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'api' | 'cache';
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  source: string;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  category: 'database' | 'api' | 'cache' | 'infrastructure' | 'application';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentPerformance: {
    metric: string;
    value: number;
    baseline: number;
  };
  expectedImprovement: {
    metric: string;
    estimatedGain: number;
    confidenceLevel: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    estimatedTime: string;
    requirements: string[];
    steps: string[];
  };
  impact: {
    userExperience: number; // 1-10 scale
    systemPerformance: number; // 1-10 scale
    cost: number; // 1-10 scale (higher = more expensive)
  };
  timestamp: Date;
}

export interface SystemHealthReport {
  timestamp: Date;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number; // 0-100
  components: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      errorRate: number;
      availability: number;
      lastCheck: Date;
    };
  };
  bottlenecks: Array<{
    component: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
  }>;
  optimizations: string[];
}

export interface PerformanceBenchmark {
  name: string;
  category: 'api' | 'database' | 'cache' | 'external_service';
  target: number;
  current: number;
  trend: 'improving' | 'stable' | 'degrading';
  lastMeasured: Date;
  history: Array<{
    timestamp: Date;
    value: number;
  }>;
}

export interface LoadTestResult {
  testId: string;
  name: string;
  timestamp: Date;
  configuration: {
    virtualUsers: number;
    duration: number;
    targetEndpoint: string;
    rampUpTime: number;
  };
  results: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  recommendations: string[];
}

@Injectable()
export class PerformanceOptimizationService {
  private performanceThresholds = {
    cpu: { warning: 70, critical: 85 },
    memory: { warning: 75, critical: 90 },
    disk: { warning: 80, critical: 95 },
    apiResponseTime: { warning: 1000, critical: 2000 },
    errorRate: { warning: 2, critical: 5 },
    cacheHitRate: { warning: 80, critical: 70 }, // Lower is worse for cache
    databaseConnections: { warning: 80, critical: 95 }
  };

  constructor(
    private redisService: RedisService,
    private loggingService: LoggingService,
    private analyticsService: AnalyticsService,
    private alertingService: AlertingService
  ) {
    this.initializeMonitoring();
  }

  // Performance Monitoring
  async collectPerformanceMetrics(): Promise<PerformanceMetric[]> {
    try {
      const metrics: PerformanceMetric[] = [];
      const timestamp = new Date();

      // Get system metrics from analytics service
      const systemMetrics = await this.analyticsService.getPerformanceMetrics();

      // CPU Metrics
      metrics.push({
        timestamp,
        metricType: 'cpu',
        value: systemMetrics.systemHealth.cpuUsage,
        threshold: this.performanceThresholds.cpu.warning,
        status: this.getMetricStatus(systemMetrics.systemHealth.cpuUsage, this.performanceThresholds.cpu),
        source: 'system_monitor'
      });

      // Memory Metrics
      metrics.push({
        timestamp,
        metricType: 'memory',
        value: systemMetrics.systemHealth.memoryUsage,
        threshold: this.performanceThresholds.memory.warning,
        status: this.getMetricStatus(systemMetrics.systemHealth.memoryUsage, this.performanceThresholds.memory),
        source: 'system_monitor'
      });

      // Disk Metrics
      metrics.push({
        timestamp,
        metricType: 'disk',
        value: systemMetrics.systemHealth.diskUsage,
        threshold: this.performanceThresholds.disk.warning,
        status: this.getMetricStatus(systemMetrics.systemHealth.diskUsage, this.performanceThresholds.disk),
        source: 'system_monitor'
      });

      // API Metrics
      metrics.push({
        timestamp,
        metricType: 'api',
        value: systemMetrics.apiResponseTime.average,
        threshold: this.performanceThresholds.apiResponseTime.warning,
        status: this.getMetricStatus(systemMetrics.apiResponseTime.average, this.performanceThresholds.apiResponseTime),
        source: 'api_monitor'
      });

      // Database Metrics
      metrics.push({
        timestamp,
        metricType: 'database',
        value: systemMetrics.systemHealth.databaseConnections,
        threshold: this.performanceThresholds.databaseConnections.warning,
        status: this.getMetricStatus(systemMetrics.systemHealth.databaseConnections, this.performanceThresholds.databaseConnections),
        source: 'database_monitor'
      });

      // Cache Metrics (mock - would integrate with actual cache monitoring)
      const cacheHitRate = 85 + Math.random() * 10; // Mock 85-95% hit rate
      metrics.push({
        timestamp,
        metricType: 'cache',
        value: cacheHitRate,
        threshold: this.performanceThresholds.cacheHitRate.warning,
        status: cacheHitRate >= this.performanceThresholds.cacheHitRate.warning ? 'normal' : 
                cacheHitRate >= this.performanceThresholds.cacheHitRate.critical ? 'warning' : 'critical',
        source: 'redis_monitor'
      });

      // Store metrics for historical analysis
      await this.storeMetrics(metrics);

      // Check for performance issues and trigger alerts
      await this.analyzeMetricsForIssues(metrics);

      return metrics;
    } catch (error) {
      this.loggingService.error('Failed to collect performance metrics', error);
      return [];
    }
  }

  // System Optimization Recommendations
  async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];
      const currentMetrics = await this.collectPerformanceMetrics();
      const benchmarks = await this.getBenchmarks();

      // Analyze each component for optimization opportunities
      const dbOptimizations = await this.analyzeDatabasePerformance(currentMetrics, benchmarks);
      const apiOptimizations = await this.analyzeApiPerformance(currentMetrics, benchmarks);
      const cacheOptimizations = await this.analyzeCachePerformance(currentMetrics, benchmarks);
      const infraOptimizations = await this.analyzeInfrastructurePerformance(currentMetrics, benchmarks);

      recommendations.push(...dbOptimizations, ...apiOptimizations, ...cacheOptimizations, ...infraOptimizations);

      // Sort by priority and impact
      recommendations.sort((a, b) => {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority] || 1;
        const bPriority = priorityWeight[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // If same priority, sort by combined impact score
        const aImpact = (a.impact.userExperience + a.impact.systemPerformance) / 2;
        const bImpact = (b.impact.userExperience + b.impact.systemPerformance) / 2;
        return bImpact - aImpact;
      });

      // Cache recommendations
      await this.redisService.setex(
        'optimization_recommendations',
        3600, // 1 hour
        JSON.stringify(recommendations)
      );

      this.loggingService.info('Optimization recommendations generated', {
        totalRecommendations: recommendations.length,
        criticalCount: recommendations.filter(r => r.priority === 'critical').length,
        highCount: recommendations.filter(r => r.priority === 'high').length
      });

      return recommendations;
    } catch (error) {
      this.loggingService.error('Failed to generate optimization recommendations', error);
      return [];
    }
  }

  // System Health Assessment
  async assessSystemHealth(): Promise<SystemHealthReport> {
    try {
      const timestamp = new Date();
      const metrics = await this.collectPerformanceMetrics();
      const realTimeMetrics = await this.analyticsService.getRealTimeMetrics();

      // Assess component health
      const components: SystemHealthReport['components'] = {
        api: {
          status: this.getComponentStatus(metrics.find(m => m.metricType === 'api')?.status || 'normal'),
          responseTime: metrics.find(m => m.metricType === 'api')?.value || 0,
          errorRate: (await this.analyticsService.getPerformanceMetrics()).errorRates.overall,
          availability: 99.5, // Mock availability percentage
          lastCheck: timestamp
        },
        database: {
          status: this.getComponentStatus(metrics.find(m => m.metricType === 'database')?.status || 'normal'),
          responseTime: 15 + Math.random() * 10, // Mock DB response time
          errorRate: 0.1,
          availability: 99.9,
          lastCheck: timestamp
        },
        cache: {
          status: this.getComponentStatus(metrics.find(m => m.metricType === 'cache')?.status || 'normal'),
          responseTime: 2 + Math.random() * 3, // Mock cache response time
          errorRate: 0.05,
          availability: 99.95,
          lastCheck: timestamp
        },
        external_services: {
          status: 'healthy',
          responseTime: Object.values(realTimeMetrics.externalServiceStatus).reduce((sum, service) => sum + service.responseTime, 0) / 
                        Object.keys(realTimeMetrics.externalServiceStatus).length,
          errorRate: Object.values(realTimeMetrics.externalServiceStatus).reduce((sum, service) => sum + service.errorRate, 0) / 
                    Object.keys(realTimeMetrics.externalServiceStatus).length,
          availability: 99.2,
          lastCheck: timestamp
        }
      };

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(metrics, components);

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(components, bottlenecks);
      const overallHealth = this.getOverallHealth(healthScore);

      // Generate optimization suggestions
      const optimizations = this.generateQuickOptimizations(metrics, bottlenecks);

      const report: SystemHealthReport = {
        timestamp,
        overallHealth,
        healthScore,
        components,
        bottlenecks,
        optimizations
      };

      // Cache health report
      await this.redisService.setex(
        'system_health_report',
        300, // 5 minutes
        JSON.stringify(report)
      );

      this.loggingService.info('System health assessed', {
        overallHealth,
        healthScore,
        bottleneckCount: bottlenecks.length
      });

      return report;
    } catch (error) {
      this.loggingService.error('Failed to assess system health', error);
      return {
        timestamp: new Date(),
        overallHealth: 'poor',
        healthScore: 0,
        components: {},
        bottlenecks: [],
        optimizations: []
      };
    }
  }

  // Performance Benchmarking
  async updateBenchmarks(): Promise<PerformanceBenchmark[]> {
    try {
      const benchmarks: PerformanceBenchmark[] = [];
      const currentMetrics = await this.collectPerformanceMetrics();
      const performanceMetrics = await this.analyticsService.getPerformanceMetrics();

      // API Response Time Benchmark
      benchmarks.push({
        name: 'API Response Time',
        category: 'api',
        target: 200, // 200ms target
        current: performanceMetrics.apiResponseTime.average,
        trend: this.calculateTrend(performanceMetrics.apiResponseTime.average, 180), // Compare to historical 180ms
        lastMeasured: new Date(),
        history: await this.getMetricHistory('api_response_time', 24) // Last 24 hours
      });

      // Database Query Performance
      benchmarks.push({
        name: 'Database Query Performance',
        category: 'database',
        target: 50, // 50ms average query time
        current: 45 + Math.random() * 20, // Mock current performance
        trend: this.calculateTrend(55, 60),
        lastMeasured: new Date(),
        history: await this.getMetricHistory('database_query_time', 24)
      });

      // Cache Hit Rate
      const cacheMetric = currentMetrics.find(m => m.metricType === 'cache');
      benchmarks.push({
        name: 'Cache Hit Rate',
        category: 'cache',
        target: 95, // 95% hit rate target
        current: cacheMetric?.value || 85,
        trend: this.calculateTrend(cacheMetric?.value || 85, 88),
        lastMeasured: new Date(),
        history: await this.getMetricHistory('cache_hit_rate', 24)
      });

      // External Service Performance
      const realTimeMetrics = await this.analyticsService.getRealTimeMetrics();
      const avgExternalResponseTime = Object.values(realTimeMetrics.externalServiceStatus)
        .reduce((sum, service) => sum + service.responseTime, 0) / 
        Object.keys(realTimeMetrics.externalServiceStatus).length;

      benchmarks.push({
        name: 'External Service Response Time',
        category: 'external_service',
        target: 500, // 500ms target for external services
        current: avgExternalResponseTime,
        trend: this.calculateTrend(avgExternalResponseTime, 450),
        lastMeasured: new Date(),
        history: await this.getMetricHistory('external_service_response_time', 24)
      });

      // Store benchmarks
      await this.redisService.setex(
        'performance_benchmarks',
        1800, // 30 minutes
        JSON.stringify(benchmarks)
      );

      return benchmarks;
    } catch (error) {
      this.loggingService.error('Failed to update benchmarks', error);
      return [];
    }
  }

  // Load Testing Integration
  async runLoadTest(config: LoadTestResult['configuration']): Promise<LoadTestResult> {
    try {
      const testId = `load_test_${Date.now()}`;
      
      // Simulate load test execution (in real implementation, would integrate with tools like k6, Artillery, etc.)
      await new Promise(resolve => setTimeout(resolve, config.duration * 100)); // Simulate test duration

      // Mock load test results
      const totalRequests = config.virtualUsers * config.duration * 2; // 2 requests per second per user
      const successRate = 0.95 + Math.random() * 0.04; // 95-99% success rate
      const successfulRequests = Math.floor(totalRequests * successRate);
      const failedRequests = totalRequests - successfulRequests;

      const result: LoadTestResult = {
        testId,
        name: `Load Test - ${config.targetEndpoint}`,
        timestamp: new Date(),
        configuration: config,
        results: {
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: 150 + Math.random() * 200, // 150-350ms
          p95ResponseTime: 300 + Math.random() * 400, // 300-700ms
          p99ResponseTime: 500 + Math.random() * 800, // 500-1300ms
          throughput: totalRequests / config.duration,
          errorRate: (failedRequests / totalRequests) * 100
        },
        recommendations: this.generateLoadTestRecommendations({
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: 150 + Math.random() * 200,
          p95ResponseTime: 300 + Math.random() * 400,
          p99ResponseTime: 500 + Math.random() * 800,
          throughput: totalRequests / config.duration,
          errorRate: (failedRequests / totalRequests) * 100
        })
      };

      // Store load test result
      await this.redisService.setex(
        `load_test_result:${testId}`,
        86400, // 24 hours
        JSON.stringify(result)
      );

      this.loggingService.info('Load test completed', {
        testId,
        virtualUsers: config.virtualUsers,
        duration: config.duration,
        successRate: successRate * 100,
        averageResponseTime: result.results.averageResponseTime
      });

      return result;
    } catch (error) {
      this.loggingService.error('Failed to run load test', error);
      throw error;
    }
  }

  // Scheduled Performance Monitoring
  @Cron('*/5 * * * *') // Every 5 minutes
  async performanceMonitoringJob(): Promise<void> {
    await this.collectPerformanceMetrics();
  }

  @Cron('*/15 * * * *') // Every 15 minutes
  async systemHealthCheckJob(): Promise<void> {
    await this.assessSystemHealth();
  }

  @Cron('0 */1 * * *') // Every hour
  async optimizationAnalysisJob(): Promise<void> {
    await this.generateOptimizationRecommendations();
    await this.updateBenchmarks();
  }

  // Private helper methods
  private getMetricStatus(value: number, thresholds: { warning: number; critical: number }): 'normal' | 'warning' | 'critical' {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'normal';
  }

  private getComponentStatus(metricStatus: string): 'healthy' | 'degraded' | 'down' {
    switch (metricStatus) {
      case 'normal': return 'healthy';
      case 'warning': return 'degraded';
      case 'critical': return 'down';
      default: return 'healthy';
    }
  }

  private async storeMetrics(metrics: PerformanceMetric[]): Promise<void> {
    for (const metric of metrics) {
      const key = `performance_metric:${metric.metricType}:${metric.timestamp.toISOString()}`;
      await this.redisService.setex(key, 86400, JSON.stringify(metric)); // Store for 24 hours
    }
  }

  private async analyzeMetricsForIssues(metrics: PerformanceMetric[]): Promise<void> {
    for (const metric of metrics) {
      if (metric.status === 'critical') {
        await this.alertingService.triggerAlert({
          title: `Critical Performance Issue: ${metric.metricType.toUpperCase()}`,
          description: `${metric.metricType} usage at ${metric.value.toFixed(1)}% (threshold: ${metric.threshold}%)`,
          severity: AlertSeverity.CRITICAL,
          category: AlertCategory.PERFORMANCE,
          source: metric.source,
          data: { metric: metric.metricType, value: metric.value, threshold: metric.threshold }
        });
      } else if (metric.status === 'warning') {
        await this.alertingService.triggerAlert({
          title: `Performance Warning: ${metric.metricType.toUpperCase()}`,
          description: `${metric.metricType} usage at ${metric.value.toFixed(1)}% (threshold: ${metric.threshold}%)`,
          severity: AlertSeverity.WARNING,
          category: AlertCategory.PERFORMANCE,
          source: metric.source,
          data: { metric: metric.metricType, value: metric.value, threshold: metric.threshold }
        });
      }
    }
  }

  private async analyzeDatabasePerformance(metrics: PerformanceMetric[], benchmarks: PerformanceBenchmark[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const dbMetric = metrics.find(m => m.metricType === 'database');
    
    if (dbMetric && dbMetric.status !== 'normal') {
      recommendations.push({
        id: 'optimize_database_connections',
        title: 'Optimize Database Connection Pool',
        category: 'database',
        priority: dbMetric.status === 'critical' ? 'critical' : 'high',
        description: 'Database connection usage is high. Consider optimizing connection pooling and query performance.',
        currentPerformance: {
          metric: 'Connection Usage',
          value: dbMetric.value,
          baseline: dbMetric.threshold
        },
        expectedImprovement: {
          metric: 'Response Time Reduction',
          estimatedGain: 25,
          confidenceLevel: 80
        },
        implementation: {
          effort: 'medium',
          estimatedTime: '4-6 hours',
          requirements: ['Database optimization expertise', 'Testing environment'],
          steps: [
            'Analyze slow query logs',
            'Optimize connection pool settings',
            'Add database indexes where needed',
            'Monitor performance improvements'
          ]
        },
        impact: {
          userExperience: 8,
          systemPerformance: 9,
          cost: 3
        },
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  private async analyzeApiPerformance(metrics: PerformanceMetric[], benchmarks: PerformanceBenchmark[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const apiMetric = metrics.find(m => m.metricType === 'api');
    
    if (apiMetric && apiMetric.value > 500) { // If API response time > 500ms
      recommendations.push({
        id: 'optimize_api_response_time',
        title: 'Optimize API Response Time',
        category: 'api',
        priority: apiMetric.value > 1000 ? 'high' : 'medium',
        description: 'API response times are above optimal levels. Consider implementing caching and query optimization.',
        currentPerformance: {
          metric: 'Average Response Time',
          value: apiMetric.value,
          baseline: 200
        },
        expectedImprovement: {
          metric: 'Response Time Reduction',
          estimatedGain: 40,
          confidenceLevel: 75
        },
        implementation: {
          effort: 'medium',
          estimatedTime: '6-8 hours',
          requirements: ['API performance analysis', 'Caching implementation'],
          steps: [
            'Identify slow API endpoints',
            'Implement response caching',
            'Optimize database queries',
            'Add API rate limiting'
          ]
        },
        impact: {
          userExperience: 9,
          systemPerformance: 7,
          cost: 4
        },
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  private async analyzeCachePerformance(metrics: PerformanceMetric[], benchmarks: PerformanceBenchmark[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const cacheMetric = metrics.find(m => m.metricType === 'cache');
    
    if (cacheMetric && cacheMetric.value < 90) { // If cache hit rate < 90%
      recommendations.push({
        id: 'improve_cache_strategy',
        title: 'Improve Cache Hit Rate',
        category: 'cache',
        priority: cacheMetric.value < 80 ? 'high' : 'medium',
        description: 'Cache hit rate is below optimal levels. Consider reviewing cache strategy and TTL settings.',
        currentPerformance: {
          metric: 'Cache Hit Rate',
          value: cacheMetric.value,
          baseline: 95
        },
        expectedImprovement: {
          metric: 'Cache Hit Rate Increase',
          estimatedGain: 15,
          confidenceLevel: 85
        },
        implementation: {
          effort: 'low',
          estimatedTime: '2-4 hours',
          requirements: ['Cache analysis', 'Configuration updates'],
          steps: [
            'Analyze cache miss patterns',
            'Optimize cache key strategies',
            'Adjust TTL settings',
            'Implement cache warming'
          ]
        },
        impact: {
          userExperience: 7,
          systemPerformance: 8,
          cost: 2
        },
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  private async analyzeInfrastructurePerformance(metrics: PerformanceMetric[], benchmarks: PerformanceBenchmark[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const cpuMetric = metrics.find(m => m.metricType === 'cpu');
    const memoryMetric = metrics.find(m => m.metricType === 'memory');
    
    if (cpuMetric && cpuMetric.status !== 'normal') {
      recommendations.push({
        id: 'optimize_cpu_usage',
        title: 'Optimize CPU Usage',
        category: 'infrastructure',
        priority: cpuMetric.status === 'critical' ? 'critical' : 'high',
        description: 'CPU usage is above optimal levels. Consider scaling resources or optimizing application performance.',
        currentPerformance: {
          metric: 'CPU Usage',
          value: cpuMetric.value,
          baseline: 50
        },
        expectedImprovement: {
          metric: 'CPU Usage Reduction',
          estimatedGain: 30,
          confidenceLevel: 70
        },
        implementation: {
          effort: 'high',
          estimatedTime: '1-2 days',
          requirements: ['Infrastructure scaling', 'Performance profiling'],
          steps: [
            'Profile application performance',
            'Identify CPU-intensive operations',
            'Optimize algorithms and queries',
            'Consider horizontal scaling'
          ]
        },
        impact: {
          userExperience: 8,
          systemPerformance: 9,
          cost: 7
        },
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  private identifyBottlenecks(metrics: PerformanceMetric[], components: SystemHealthReport['components']): SystemHealthReport['bottlenecks'] {
    const bottlenecks: SystemHealthReport['bottlenecks'] = [];

    // Check for metric-based bottlenecks
    metrics.forEach(metric => {
      if (metric.status === 'critical') {
        bottlenecks.push({
          component: metric.metricType,
          severity: 'high',
          description: `${metric.metricType} usage at ${metric.value.toFixed(1)}%`,
          impact: 'Severe performance degradation'
        });
      } else if (metric.status === 'warning') {
        bottlenecks.push({
          component: metric.metricType,
          severity: 'medium',
          description: `${metric.metricType} usage at ${metric.value.toFixed(1)}%`,
          impact: 'Moderate performance impact'
        });
      }
    });

    // Check for component-based bottlenecks
    Object.entries(components).forEach(([name, component]) => {
      if (component.status === 'degraded') {
        bottlenecks.push({
          component: name,
          severity: 'medium',
          description: `${name} service is degraded`,
          impact: 'Reduced service reliability'
        });
      } else if (component.status === 'down') {
        bottlenecks.push({
          component: name,
          severity: 'high',
          description: `${name} service is down`,
          impact: 'Service unavailable'
        });
      }
    });

    return bottlenecks;
  }

  private calculateHealthScore(components: SystemHealthReport['components'], bottlenecks: SystemHealthReport['bottlenecks']): number {
    let score = 100;

    // Deduct points for component issues
    Object.values(components).forEach(component => {
      if (component.status === 'degraded') score -= 10;
      if (component.status === 'down') score -= 25;
      if (component.errorRate > 1) score -= 5;
      if (component.availability < 99) score -= 5;
    });

    // Deduct points for bottlenecks
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'low') score -= 5;
      if (bottleneck.severity === 'medium') score -= 10;
      if (bottleneck.severity === 'high') score -= 20;
    });

    return Math.max(0, score);
  }

  private getOverallHealth(score: number): SystemHealthReport['overallHealth'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  private generateQuickOptimizations(metrics: PerformanceMetric[], bottlenecks: SystemHealthReport['bottlenecks']): string[] {
    const optimizations: string[] = [];

    metrics.forEach(metric => {
      if (metric.status !== 'normal') {
        switch (metric.metricType) {
          case 'cpu':
            optimizations.push('Optimize CPU-intensive operations');
            break;
          case 'memory':
            optimizations.push('Review memory usage and implement garbage collection optimization');
            break;
          case 'disk':
            optimizations.push('Clean up temporary files and optimize disk I/O');
            break;
          case 'api':
            optimizations.push('Implement API response caching');
            break;
          case 'database':
            optimizations.push('Optimize database query performance');
            break;
          case 'cache':
            optimizations.push('Improve cache hit rate and strategy');
            break;
        }
      }
    });

    if (bottlenecks.length > 3) {
      optimizations.push('Review system architecture for scalability improvements');
    }

    return [...new Set(optimizations)]; // Remove duplicates
  }

  private calculateTrend(current: number, previous: number): 'improving' | 'stable' | 'degrading' {
    const changePercent = ((current - previous) / previous) * 100;
    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent > 0 ? 'degrading' : 'improving';
  }

  private async getMetricHistory(metricName: string, hours: number): Promise<Array<{ timestamp: Date; value: number }>> {
    // Mock implementation - would query actual metric history
    const history: Array<{ timestamp: Date; value: number }> = [];
    const now = new Date();
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const value = 100 + Math.random() * 100; // Mock values
      history.push({ timestamp, value });
    }
    
    return history;
  }

  private generateLoadTestRecommendations(results: LoadTestResult['results']): string[] {
    const recommendations: string[] = [];

    if (results.errorRate > 1) {
      recommendations.push('Investigate and fix errors causing high error rate');
    }

    if (results.averageResponseTime > 500) {
      recommendations.push('Optimize response times through caching and query optimization');
    }

    if (results.p99ResponseTime > 2000) {
      recommendations.push('Address outlier performance issues affecting P99 response times');
    }

    if (results.throughput < 100) {
      recommendations.push('Consider scaling infrastructure to improve throughput');
    }

    return recommendations;
  }

  private initializeMonitoring(): void {
    this.loggingService.info('Performance optimization service initialized');
  }

  // Public getter methods for API access
  async getBenchmarks(): Promise<PerformanceBenchmark[]> {
    const cached = await this.redisService.get('performance_benchmarks');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.updateBenchmarks();
  }

  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const cached = await this.redisService.get('optimization_recommendations');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.generateOptimizationRecommendations();
  }

  async getSystemHealth(): Promise<SystemHealthReport> {
    const cached = await this.redisService.get('system_health_report');
    if (cached) {
      return JSON.parse(cached);
    }
    return this.assessSystemHealth();
  }

  async getLoadTestResults(limit: number = 10): Promise<LoadTestResult[]> {
    try {
      const pattern = 'load_test_result:*';
      const keys = await this.redisService.keys(pattern);
      const results: LoadTestResult[] = [];

      for (const key of keys.slice(0, limit)) {
        const data = await this.redisService.get(key);
        if (data) {
          results.push(JSON.parse(data));
        }
      }

      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      this.loggingService.error('Failed to get load test results', error);
      return [];
    }
  }
}