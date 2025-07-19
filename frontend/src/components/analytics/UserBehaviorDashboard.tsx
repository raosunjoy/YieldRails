'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Users, TrendingUp, TrendingDown, Target, Brain, AlertTriangle, CheckCircle, DollarSign, Activity, Zap, UserCheck } from 'lucide-react';

interface UserSegment {
  id: string;
  name: string;
  description: string;
  userCount: number;
  averageValue: number;
  growthRate: number;
}

interface UserCohort {
  cohortId: string;
  name: string;
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

interface UserBehaviorPattern {
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

interface BusinessInsight {
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
  timestamp: string;
}

const UserBehaviorDashboard: React.FC = () => {
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [cohorts, setCohorts] = useState<UserCohort[]>([]);
  const [patterns, setPatterns] = useState<UserBehaviorPattern[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [segmentsRes, cohortsRes, patternsRes, insightsRes] = await Promise.all([
        fetch('/api/user-behavior/segments'),
        fetch('/api/user-behavior/cohorts'),
        fetch('/api/user-behavior/patterns'),
        fetch('/api/user-behavior/insights')
      ]);
      
      // Mock data for demonstration
      setSegments([
        {
          id: 'high_value_users',
          name: 'High Value Users',
          description: 'Users with $10k+ total transaction volume',
          userCount: 234,
          averageValue: 15750,
          growthRate: 12.5
        },
        {
          id: 'frequent_traders',
          name: 'Frequent Traders',
          description: 'Users with 20+ transactions',
          userCount: 456,
          averageValue: 8920,
          growthRate: 8.3
        },
        {
          id: 'new_users',
          name: 'New Users',
          description: 'Users registered in last 30 days',
          userCount: 1234,
          averageValue: 2450,
          growthRate: 25.7
        },
        {
          id: 'conservative_investors',
          name: 'Conservative Investors',
          description: 'Users preferring low-risk strategies',
          userCount: 567,
          averageValue: 6780,
          growthRate: 5.2
        },
        {
          id: 'yield_optimizers',
          name: 'Yield Optimizers',
          description: 'Users preferring high-yield strategies',
          userCount: 345,
          averageValue: 12340,
          growthRate: 15.8
        }
      ]);

      setCohorts([
        {
          cohortId: '2024-7',
          name: 'July 2024 Cohort',
          totalUsers: 1250,
          retentionRates: { day1: 85, day7: 62, day30: 35, day90: 22 },
          lifetimeValue: { average: 4250, median: 2800, total: 5312500 },
          conversionMetrics: { firstPaymentRate: 68, averageTimeToFirstPayment: 3.2, multiPaymentRate: 45 }
        },
        {
          cohortId: '2024-6',
          name: 'June 2024 Cohort',
          totalUsers: 1180,
          retentionRates: { day1: 82, day7: 58, day30: 32, day90: 28 },
          lifetimeValue: { average: 5180, median: 3200, total: 6112400 },
          conversionMetrics: { firstPaymentRate: 71, averageTimeToFirstPayment: 2.8, multiPaymentRate: 52 }
        },
        {
          cohortId: '2024-5',
          name: 'May 2024 Cohort',
          totalUsers: 1050,
          retentionRates: { day1: 78, day7: 55, day30: 38, day90: 31 },
          lifetimeValue: { average: 6250, median: 3800, total: 6562500 },
          conversionMetrics: { firstPaymentRate: 74, averageTimeToFirstPayment: 2.5, multiPaymentRate: 58 }
        }
      ]);

      setPatterns([
        {
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
          businessImpact: { revenue: 125000, volume: 2500000, frequency: 3.2 }
        },
        {
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
          businessImpact: { revenue: 89000, volume: 1780000, frequency: 5.8 }
        },
        {
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
          businessImpact: { revenue: 156000, volume: 3120000, frequency: 2.1 }
        }
      ]);

      setInsights([
        {
          id: 'retention_analysis',
          title: '30-Day User Retention Analysis',
          category: 'user_behavior',
          priority: 'high',
          description: 'Current 30-day retention rate is 35.0% with a positive trend',
          dataPoints: [
            { metric: '30-day retention rate', value: 35, trend: 'increasing', changePercent: 8.5 }
          ],
          recommendations: [
            'Implement onboarding improvements for new users',
            'Create engagement campaigns for day 7-14 users',
            'Analyze churned user feedback for improvement opportunities'
          ],
          impact: { category: 'user_retention', estimated: 35000, confidence: 75 },
          timestamp: new Date().toISOString()
        },
        {
          id: 'revenue_optimization',
          title: 'High-Value User Segment Growth Opportunity',
          category: 'revenue',
          priority: 'high',
          description: 'High-value users represent 234 users generating $15,750 average value',
          dataPoints: [
            { metric: 'High-value user count', value: 234, trend: 'increasing', changePercent: 12.5 }
          ],
          recommendations: [
            'Create VIP program for high-value users',
            'Offer premium yield strategies with higher limits',
            'Implement referral incentives for this segment'
          ],
          impact: { category: 'revenue_growth', estimated: 1170000, confidence: 80 },
          timestamp: new Date().toISOString()
        },
        {
          id: 'strategy_performance',
          title: 'Yield Strategy Performance Analysis',
          category: 'product',
          priority: 'medium',
          description: 'Resolv Delta Neutral strategy showing highest user preference and yield generation',
          dataPoints: [
            { metric: 'Strategy adoption rate', value: 65, trend: 'increasing', changePercent: 15.2 }
          ],
          recommendations: [
            'Increase allocation limits for high-performing strategies',
            'Create educational content for underperforming strategies',
            'Consider adding similar delta-neutral products'
          ],
          impact: { category: 'product_optimization', estimated: 250000, confidence: 70 },
          timestamp: new Date().toISOString()
        }
      ]);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async (type: string = 'all') => {
    setRefreshing(true);
    try {
      // In a real app, this would trigger analytics refresh
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      await fetchAllData();
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(num);
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

  const getRiskProfileColor = (profile: string) => {
    switch (profile) {
      case 'conservative': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'aggressive': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading user behavior analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Behavior Analytics</h1>
          <p className="text-gray-600">Advanced user insights and behavioral patterns</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            onClick={() => refreshAnalytics()}
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Insights Alert */}
      {insights.filter(i => i.priority === 'critical' || i.priority === 'high').length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {insights.filter(i => i.priority === 'critical' || i.priority === 'high').length} high-priority insights requiring attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="segments">User Segments</TabsTrigger>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="patterns">Behavior Patterns</TabsTrigger>
          <TabsTrigger value="insights">Business Insights</TabsTrigger>
        </TabsList>

        {/* User Segments Tab */}
        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {segments.map((segment) => (
              <Card key={segment.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{segment.name}</CardTitle>
                  <CardDescription>{segment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        User Count
                      </span>
                      <span className="font-bold">{formatNumber(segment.userCount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Avg Value
                      </span>
                      <span className="font-bold">{formatCurrency(segment.averageValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center">
                        {segment.growthRate >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                        )}
                        Growth Rate
                      </span>
                      <Badge variant={segment.growthRate >= 0 ? "default" : "destructive"}>
                        {segment.growthRate >= 0 ? '+' : ''}{formatNumber(segment.growthRate)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Segment Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Segment Distribution</CardTitle>
              <CardDescription>Total users across different segments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={segments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => formatNumber(value as number)} />
                  <Bar dataKey="userCount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cohort Analysis Tab */}
        <TabsContent value="cohorts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cohorts.map((cohort) => (
              <Card key={cohort.cohortId}>
                <CardHeader>
                  <CardTitle>{cohort.name}</CardTitle>
                  <CardDescription>{formatNumber(cohort.totalUsers)} total users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Retention Rates</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Day 1</span>
                          <span>{formatNumber(cohort.retentionRates.day1)}%</span>
                        </div>
                        <Progress value={cohort.retentionRates.day1} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Day 7</span>
                          <span>{formatNumber(cohort.retentionRates.day7)}%</span>
                        </div>
                        <Progress value={cohort.retentionRates.day7} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Day 30</span>
                          <span>{formatNumber(cohort.retentionRates.day30)}%</span>
                        </div>
                        <Progress value={cohort.retentionRates.day30} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Day 90</span>
                          <span>{formatNumber(cohort.retentionRates.day90)}%</span>
                        </div>
                        <Progress value={cohort.retentionRates.day90} className="h-2" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Lifetime Value</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Average</span>
                        <div className="font-medium">{formatCurrency(cohort.lifetimeValue.average)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Median</span>
                        <div className="font-medium">{formatCurrency(cohort.lifetimeValue.median)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Conversion Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>First Payment Rate</span>
                        <span>{formatNumber(cohort.conversionMetrics.firstPaymentRate)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multi-Payment Rate</span>
                        <span>{formatNumber(cohort.conversionMetrics.multiPaymentRate)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Retention Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Retention Comparison</CardTitle>
              <CardDescription>30-day retention rates across cohorts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cohorts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="retentionRates.day1" stroke="#3b82f6" name="Day 1" />
                  <Line type="monotone" dataKey="retentionRates.day7" stroke="#10b981" name="Day 7" />
                  <Line type="monotone" dataKey="retentionRates.day30" stroke="#f59e0b" name="Day 30" />
                  <Line type="monotone" dataKey="retentionRates.day90" stroke="#ef4444" name="Day 90" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="space-y-6">
            {patterns.map((pattern) => (
              <Card key={pattern.patternId}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{pattern.name}</CardTitle>
                      <CardDescription>{pattern.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{formatNumber(pattern.userCount)} users</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Characteristics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Session Duration</span>
                          <span>{pattern.characteristics.averageSessionDuration} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Profile</span>
                          <Badge className={getRiskProfileColor(pattern.characteristics.riskProfile)}>
                            {pattern.characteristics.riskProfile}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Engagement</span>
                          <Badge className={getEngagementColor(pattern.characteristics.engagement)}>
                            {pattern.characteristics.engagement}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Preferred Times</span>
                          <div className="mt-1 space-y-1">
                            {pattern.characteristics.preferredPaymentTimes.map((time, index) => (
                              <Badge key={index} variant="outline" className="mr-1">{time}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Strategy Preferences</h4>
                      <div className="space-y-2">
                        {pattern.characteristics.strategyPreferences.map((strategy, index) => (
                          <div key={index}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize">{strategy.strategyId.replace(/-/g, ' ')}</span>
                              <span>{strategy.preference}%</span>
                            </div>
                            <Progress value={strategy.preference} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Business Impact</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Revenue
                          </span>
                          <span className="font-medium">{formatCurrency(pattern.businessImpact.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center">
                            <Activity className="h-4 w-4 mr-1" />
                            Volume
                          </span>
                          <span className="font-medium">{formatCurrency(pattern.businessImpact.volume)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center">
                            <Zap className="h-4 w-4 mr-1" />
                            Frequency
                          </span>
                          <span className="font-medium">{formatNumber(pattern.businessImpact.frequency)}x/month</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Business Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-6">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        <Brain className="h-5 w-5 mr-2" />
                        {insight.title}
                      </CardTitle>
                      <CardDescription>{insight.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{insight.category.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Key Metrics</h4>
                      <div className="space-y-2">
                        {insight.dataPoints.map((point, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm">{point.metric}</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{formatNumber(point.value)}</span>
                              <div className="flex items-center">
                                {point.trend === 'increasing' ? (
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                ) : point.trend === 'decreasing' ? (
                                  <TrendingDown className="h-3 w-3 text-red-600" />
                                ) : (
                                  <div className="h-3 w-3 bg-gray-400 rounded-full" />
                                )}
                                <span className="text-xs ml-1">
                                  {point.changePercent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Impact Assessment</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Estimated Impact</span>
                            <span className="font-medium">{formatCurrency(insight.impact.estimated)}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Confidence Level</span>
                            <span>{insight.impact.confidence}%</span>
                          </div>
                          <Progress value={insight.impact.confidence} className="h-2" />
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: {insight.impact.category.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserBehaviorDashboard;