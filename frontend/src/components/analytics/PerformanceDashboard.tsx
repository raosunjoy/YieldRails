'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import { RefreshCw, Activity, Cpu, Database, Zap, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Target, Gauge, Clock, Users, HardDrive, Network, PlayCircle } from 'lucide-react';

interface PerformanceMetric {
  timestamp: string;
  metricType: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'api' | 'cache';
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  source: string;
}

interface SystemHealthReport {
  timestamp: string;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number;
  components: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      errorRate: number;
      availability: number;
      lastCheck: string;
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

interface OptimizationRecommendation {
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
    userExperience: number;
    systemPerformance: number;
    cost: number;
  };
  timestamp: string;
}

interface PerformanceBenchmark {
  name: string;
  category: 'api' | 'database' | 'cache' | 'external_service';
  target: number;
  current: number;
  trend: 'improving' | 'stable' | 'degrading';
  lastMeasured: string;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      setMetrics([
        {
          timestamp: new Date().toISOString(),
          metricType: 'cpu',
          value: 65 + Math.random() * 20,
          threshold: 70,
          status: 'warning',
          source: 'system_monitor'
        },
        {
          timestamp: new Date().toISOString(),
          metricType: 'memory',
          value: 45 + Math.random() * 30,
          threshold: 75,
          status: 'normal',
          source: 'system_monitor'
        },
        {
          timestamp: new Date().toISOString(),
          metricType: 'disk',
          value: 55 + Math.random() * 25,
          threshold: 80,
          status: 'normal',
          source: 'system_monitor'
        },
        {
          timestamp: new Date().toISOString(),
          metricType: 'api',
          value: 250 + Math.random() * 200,
          threshold: 500,
          status: 'normal',
          source: 'api_monitor'
        },
        {
          timestamp: new Date().toISOString(),
          metricType: 'database',
          value: 25 + Math.random() * 15,
          threshold: 40,
          status: 'normal',
          source: 'database_monitor'
        },
        {
          timestamp: new Date().toISOString(),
          metricType: 'cache',
          value: 88 + Math.random() * 10,
          threshold: 90,
          status: 'normal',
          source: 'redis_monitor'
        }
      ]);

      setHealthReport({
        timestamp: new Date().toISOString(),
        overallHealth: 'good',
        healthScore: 82,
        components: {
          api: {
            status: 'healthy',
            responseTime: 165,
            errorRate: 0.8,
            availability: 99.7,
            lastCheck: new Date().toISOString()
          },
          database: {
            status: 'healthy',
            responseTime: 18,
            errorRate: 0.1,
            availability: 99.9,
            lastCheck: new Date().toISOString()
          },
          cache: {
            status: 'healthy',
            responseTime: 3,
            errorRate: 0.05,
            availability: 99.95,
            lastCheck: new Date().toISOString()
          },
          external_services: {
            status: 'degraded',
            responseTime: 425,
            errorRate: 2.1,
            availability: 98.5,
            lastCheck: new Date().toISOString()
          }
        },
        bottlenecks: [
          {
            component: 'cpu',
            severity: 'medium',
            description: 'CPU usage at 75.2%',
            impact: 'Moderate performance impact'
          },
          {
            component: 'external_services',
            severity: 'medium',
            description: 'External service slow response',
            impact: 'Reduced service reliability'
          }
        ],
        optimizations: [
          'Optimize CPU-intensive operations',
          'Implement API response caching',
          'Review external service integrations'
        ]
      });

      setRecommendations([
        {
          id: 'optimize_api_response_time',
          title: 'Optimize API Response Time',
          category: 'api',
          priority: 'medium',
          description: 'API response times are above optimal levels. Consider implementing caching and query optimization.',
          currentPerformance: {
            metric: 'Average Response Time',
            value: 350,
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
          timestamp: new Date().toISOString()
        },
        {
          id: 'optimize_database_connections',
          title: 'Optimize Database Connection Pool',
          category: 'database',
          priority: 'high',
          description: 'Database connection usage is high. Consider optimizing connection pooling and query performance.',
          currentPerformance: {
            metric: 'Connection Usage',
            value: 35,
            baseline: 20
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
          timestamp: new Date().toISOString()
        },
        {
          id: 'improve_cache_strategy',
          title: 'Improve Cache Hit Rate',
          category: 'cache',
          priority: 'medium',
          description: 'Cache hit rate is below optimal levels. Consider reviewing cache strategy and TTL settings.',
          currentPerformance: {
            metric: 'Cache Hit Rate',
            value: 88,
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
          timestamp: new Date().toISOString()
        }
      ]);

      setBenchmarks([
        {
          name: 'API Response Time',
          category: 'api',
          target: 200,
          current: 165,
          trend: 'improving',
          lastMeasured: new Date().toISOString()
        },
        {
          name: 'Database Query Performance',
          category: 'database',
          target: 50,
          current: 55,
          trend: 'stable',
          lastMeasured: new Date().toISOString()
        },
        {
          name: 'Cache Hit Rate',
          category: 'cache',
          target: 95,
          current: 88,
          trend: 'degrading',
          lastMeasured: new Date().toISOString()
        },
        {
          name: 'External Service Response Time',
          category: 'external_service',
          target: 500,
          current: 425,
          trend: 'improving',
          lastMeasured: new Date().toISOString()
        }
      ]);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (type: string = 'all') => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      await fetchAllData();
    } catch (error) {
      console.error('Failed to refresh performance data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'cpu': return <Cpu className="h-4 w-4" />;
      case 'memory': return <HardDrive className="h-4 w-4" />;
      case 'disk': return <HardDrive className="h-4 w-4" />;
      case 'api': return <Network className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'cache': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': case 'healthy': return 'text-green-600';
      case 'warning': case 'degraded': return 'text-yellow-600';
      case 'critical': case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading performance dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">System monitoring and optimization tools</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            onClick={() => refreshData()}
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {healthReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gauge className="h-5 w-5 mr-2" />
              System Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="mb-2">
                  <div className={`text-3xl font-bold ${getHealthColor(healthReport.overallHealth)}`}>
                    {healthReport.healthScore}/100
                  </div>
                  <div className={`text-sm ${getHealthColor(healthReport.overallHealth)}`}>
                    {healthReport.overallHealth.toUpperCase()}
                  </div>
                </div>
                <Progress value={healthReport.healthScore} className="h-3" />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Components</h4>
                <div className="space-y-1">
                  {Object.entries(healthReport.components).map(([name, component]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{name.replace('_', ' ')}</span>
                      <div className="flex items-center">
                        {component.status === 'healthy' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className={`ml-1 ${getStatusColor(component.status)}`}>
                          {component.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Bottlenecks</h4>
                <div className="space-y-1">
                  {healthReport.bottlenecks.slice(0, 3).map((bottleneck, index) => (
                    <div key={index} className="text-sm">
                      <Badge variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                        {bottleneck.component}
                      </Badge>
                    </div>
                  ))}
                  {healthReport.bottlenecks.length === 0 && (
                    <div className="text-sm text-gray-500">No bottlenecks detected</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Quick Actions</h4>
                <div className="space-y-1">
                  {healthReport.optimizations.slice(0, 3).map((optimization, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      • {optimization}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    {getMetricIcon(metric.metricType)}
                    <span className="ml-2 capitalize">{metric.metricType}</span>
                  </CardTitle>
                  <Badge variant={metric.status === 'normal' ? 'default' : metric.status === 'warning' ? 'secondary' : 'destructive'}>
                    {metric.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold">
                        {metric.metricType === 'api' ? `${formatNumber(metric.value)}ms` : `${formatNumber(metric.value)}%`}
                      </div>
                      <p className="text-xs text-gray-600">
                        Threshold: {metric.metricType === 'api' ? `${metric.threshold}ms` : `${metric.threshold}%`}
                      </p>
                    </div>
                    <Progress 
                      value={metric.metricType === 'api' ? (metric.value / metric.threshold) * 100 : metric.value} 
                      className="h-2" 
                    />
                    <div className="text-xs text-gray-500">
                      Source: {metric.source}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Metrics Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Overview</CardTitle>
              <CardDescription>Current system resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.filter(m => m.metricType !== 'api')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metricType" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`${formatNumber(value as number)}%`, 'Usage']} />
                  <Bar dataKey="value" fill="#3b82f6" />
                  <Bar dataKey="threshold" fill="#ef4444" opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benchmarks.map((benchmark, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{benchmark.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {benchmark.category}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Current</span>
                      <span className="font-bold">
                        {benchmark.category === 'cache' ? `${formatNumber(benchmark.current)}%` : `${formatNumber(benchmark.current)}ms`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Target</span>
                      <span className="text-gray-600">
                        {benchmark.category === 'cache' ? `${formatNumber(benchmark.target)}%` : `${formatNumber(benchmark.target)}ms`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Trend</span>
                      <div className="flex items-center">
                        {benchmark.trend === 'improving' ? (
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        ) : benchmark.trend === 'degrading' ? (
                          <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                        ) : (
                          <div className="h-4 w-4 bg-gray-400 rounded-full mr-1" />
                        )}
                        <span className="capitalize text-sm">{benchmark.trend}</span>
                      </div>
                    </div>
                    <Progress 
                      value={benchmark.category === 'cache' ? benchmark.current : Math.min((benchmark.target / benchmark.current) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benchmarks Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarks vs Targets</CardTitle>
              <CardDescription>How current performance compares to targets</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={benchmarks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" fill="#3b82f6" name="Current" />
                  <Bar dataKey="target" fill="#10b981" name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="space-y-6">
            {recommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{recommendation.title}</CardTitle>
                      <CardDescription>{recommendation.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(recommendation.priority)}>
                        {recommendation.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{recommendation.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Current Performance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{recommendation.currentPerformance.metric}</span>
                          <span className="font-medium">{formatNumber(recommendation.currentPerformance.value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Baseline</span>
                          <span>{formatNumber(recommendation.currentPerformance.baseline)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected Gain</span>
                          <span className="text-green-600 font-medium">
                            {formatNumber(recommendation.expectedImprovement.estimatedGain)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidence</span>
                          <span>{recommendation.expectedImprovement.confidenceLevel}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Implementation</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Effort Level</span>
                          <Badge variant="outline" className="capitalize">
                            {recommendation.implementation.effort}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimated Time</span>
                          <span>{recommendation.implementation.estimatedTime}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Requirements</span>
                          <ul className="mt-1 space-y-1">
                            {recommendation.implementation.requirements.map((req, index) => (
                              <li key={index} className="text-xs">• {req}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Impact Assessment</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>User Experience</span>
                            <span>{recommendation.impact.userExperience}/10</span>
                          </div>
                          <Progress value={recommendation.impact.userExperience * 10} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>System Performance</span>
                            <span>{recommendation.impact.systemPerformance}/10</span>
                          </div>
                          <Progress value={recommendation.impact.systemPerformance * 10} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Implementation Cost</span>
                            <span>{recommendation.impact.cost}/10</span>
                          </div>
                          <Progress value={recommendation.impact.cost * 10} className="h-2 bg-red-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Optimization Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Recommendations</span>
                    <Badge variant="outline">{recommendations.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Critical Priority</span>
                    <Badge className="bg-red-500">
                      {recommendations.filter(r => r.priority === 'critical').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>High Priority</span>
                    <Badge className="bg-orange-500">
                      {recommendations.filter(r => r.priority === 'high').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Estimated Total Impact</span>
                    <span className="font-bold text-green-600">
                      +{formatNumber(recommendations.reduce((sum, r) => sum + r.expectedImprovement.estimatedGain, 0) / recommendations.length)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All Metrics
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Run Performance Test
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Update Benchmarks
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Gauge className="h-4 w-4 mr-2" />
                    Generate Health Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimization Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Impact vs Effort</CardTitle>
              <CardDescription>Priority matrix for performance improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={recommendations.map(r => ({
                  name: r.title.substring(0, 20) + '...',
                  impact: (r.impact.userExperience + r.impact.systemPerformance) / 2,
                  effort: r.implementation.effort === 'low' ? 1 : r.implementation.effort === 'medium' ? 2 : 3,
                  priority: r.priority
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="impact" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;