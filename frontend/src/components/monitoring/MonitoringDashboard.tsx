'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Activity, Users, DollarSign, Zap } from 'lucide-react';

interface BusinessMetrics {
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

interface PerformanceMetrics {
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

interface RealTimeMetrics {
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

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  timestamp: string;
  resolved?: boolean;
}

const MonitoringDashboard: React.FC = () => {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real app, these would be actual API calls
      const [businessRes, performanceRes, realTimeRes, alertsRes] = await Promise.all([
        fetch(`/api/analytics/business-metrics?timeframe=${timeframe}`),
        fetch('/api/analytics/performance-metrics'),
        fetch('/api/analytics/real-time-metrics'),
        fetch('/api/alerts/active')
      ]);
      
      // Mock data for demonstration
      setBusinessMetrics({
        totalPayments: 1234,
        totalVolume: '2,567,890.45',
        totalYieldGenerated: '45,234.67',
        activeUsers: 5678,
        averagePaymentSize: '2,081.23',
        platformRevenue: '4,523.47',
        yieldDistribution: {
          userYield: '31,664.27',
          merchantYield: '9,046.93',
          protocolYield: '4,523.47'
        },
        topStrategies: [
          { strategyId: 'noble-tbill-3m', name: 'Noble T-Bills 3M', volume: '1,234,567', apy: 5.2, usage: 450 },
          { strategyId: 'aave-lending-v3', name: 'Aave Lending V3', volume: '987,654', apy: 4.8, usage: 321 },
          { strategyId: 'resolv-delta-neutral', name: 'Resolv Delta Neutral', volume: '567,890', apy: 6.1, usage: 234 },
          { strategyId: 'compound-v3', name: 'Compound V3', volume: '345,678', apy: 4.2, usage: 156 }
        ]
      });
      
      setPerformanceMetrics({
        apiResponseTime: {
          average: 85 + Math.random() * 30,
          p95: 150 + Math.random() * 50,
          p99: 250 + Math.random() * 100
        },
        errorRates: {
          overall: Math.random() * 2,
          byEndpoint: {
            '/api/payments': Math.random() * 1,
            '/api/yield': Math.random() * 0.5,
            '/api/crosschain': Math.random() * 1.5,
            '/api/auth': Math.random() * 0.3
          }
        },
        throughput: {
          requestsPerSecond: 45 + Math.random() * 20,
          paymentsPerHour: 125 + Math.random() * 50
        },
        systemHealth: {
          cpuUsage: 35 + Math.random() * 30,
          memoryUsage: 45 + Math.random() * 25,
          diskUsage: 55 + Math.random() * 20,
          databaseConnections: 15 + Math.random() * 10
        }
      });
      
      setRealTimeMetrics({
        activePayments: 156 + Math.floor(Math.random() * 20),
        pendingTransactions: 23 + Math.floor(Math.random() * 10),
        liveTradingVolume: (125000 + Math.random() * 50000).toFixed(2),
        systemLoad: {
          api: Math.random() * 100,
          database: Math.random() * 100,
          redis: Math.random() * 100
        },
        externalServiceStatus: {
          noble: { status: 'healthy', responseTime: 120 + Math.random() * 50, errorRate: Math.random() * 2 },
          resolv: { status: 'healthy', responseTime: 150 + Math.random() * 60, errorRate: Math.random() * 3 },
          aave: { status: 'healthy', responseTime: 200 + Math.random() * 80, errorRate: Math.random() * 1 },
          circle: { status: 'healthy', responseTime: 300 + Math.random() * 100, errorRate: Math.random() * 4 }
        }
      });
      
      // Mock alerts
      setAlerts([
        {
          id: '1',
          title: 'High API Response Time',
          description: 'Average response time above 200ms',
          severity: 'warning',
          category: 'performance',
          timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
        },
        {
          id: '2',
          title: 'External Service Slow',
          description: 'Circle CCTP response time degraded',
          severity: 'info',
          category: 'external_service',
          timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      ]);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'error': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  if (loading && !businessMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time system monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            onClick={fetchDashboardData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert key={alert.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-gray-600">{alert.description}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="external">External Services</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Payments</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{realTimeMetrics?.activePayments || 0}</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {businessMetrics ? formatCurrency(businessMetrics.totalVolume) : '$0'}
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{businessMetrics?.activeUsers || 0}</div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Yield Generated</CardTitle>
                <Zap className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {businessMetrics ? formatCurrency(businessMetrics.totalYieldGenerated) : '$0'}
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +22% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceMetrics && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>{formatNumber(performanceMetrics.systemHealth.cpuUsage)}%</span>
                      </div>
                      <Progress value={performanceMetrics.systemHealth.cpuUsage} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{formatNumber(performanceMetrics.systemHealth.memoryUsage)}%</span>
                      </div>
                      <Progress value={performanceMetrics.systemHealth.memoryUsage} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Disk Usage</span>
                        <span>{formatNumber(performanceMetrics.systemHealth.diskUsage)}%</span>
                      </div>
                      <Progress value={performanceMetrics.systemHealth.diskUsage} className="h-2" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-Time Metrics</CardTitle>
                <CardDescription>Live system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Pending Transactions</span>
                    <Badge variant="outline">{realTimeMetrics?.pendingTransactions || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Live Trading Volume</span>
                    <Badge variant="outline">
                      {realTimeMetrics ? formatCurrency(realTimeMetrics.liveTradingVolume) : '$0'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">API Load</span>
                    <Progress 
                      value={realTimeMetrics?.systemLoad.api || 0} 
                      className="w-20 h-2" 
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Load</span>
                    <Progress 
                      value={realTimeMetrics?.systemLoad.database || 0} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Response Times</CardTitle>
                <CardDescription>Response time distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMetrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Average</span>
                      <Badge variant="outline">{formatNumber(performanceMetrics.apiResponseTime.average)}ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>95th Percentile</span>
                      <Badge variant="outline">{formatNumber(performanceMetrics.apiResponseTime.p95)}ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>99th Percentile</span>
                      <Badge variant="outline">{formatNumber(performanceMetrics.apiResponseTime.p99)}ms</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rates</CardTitle>
                <CardDescription>API endpoint error rates</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMetrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Overall</span>
                      <Badge variant={performanceMetrics.errorRates.overall > 5 ? "destructive" : "outline"}>
                        {formatNumber(performanceMetrics.errorRates.overall)}%
                      </Badge>
                    </div>
                    {Object.entries(performanceMetrics.errorRates.byEndpoint).map(([endpoint, rate]) => (
                      <div key={endpoint} className="flex justify-between items-center">
                        <span className="text-sm">{endpoint}</span>
                        <Badge variant={rate > 2 ? "destructive" : "outline"}>
                          {formatNumber(rate)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Yield Distribution</CardTitle>
                <CardDescription>Revenue sharing breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {businessMetrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>User Yield (70%)</span>
                      <span className="font-medium">{formatCurrency(businessMetrics.yieldDistribution.userYield)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Merchant Yield (20%)</span>
                      <span className="font-medium">{formatCurrency(businessMetrics.yieldDistribution.merchantYield)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Protocol Yield (10%)</span>
                      <span className="font-medium">{formatCurrency(businessMetrics.yieldDistribution.protocolYield)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Yield Strategies</CardTitle>
                <CardDescription>Most popular strategies by volume</CardDescription>
              </CardHeader>
              <CardContent>
                {businessMetrics && (
                  <div className="space-y-4">
                    {businessMetrics.topStrategies.slice(0, 4).map((strategy, index) => (
                      <div key={strategy.strategyId} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{strategy.name}</div>
                          <div className="text-xs text-gray-500">{strategy.apy}% APY • {strategy.usage} users</div>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(strategy.volume)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* External Services Tab */}
        <TabsContent value="external" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>External Service Status</CardTitle>
              <CardDescription>Health status of integrated DeFi protocols</CardDescription>
            </CardHeader>
            <CardContent>
              {realTimeMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(realTimeMetrics.externalServiceStatus).map(([service, status]) => (
                    <div key={service} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium capitalize">{service} Protocol</h3>
                        <div className="flex items-center space-x-2">
                          {status.status === 'healthy' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : status.status === 'degraded' ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <Badge 
                            variant={status.status === 'healthy' ? "default" : "destructive"}
                            className={getStatusColor(status.status)}
                          >
                            {status.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Response Time</span>
                          <span>{formatNumber(status.responseTime)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate</span>
                          <span>{formatNumber(status.errorRate)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;
