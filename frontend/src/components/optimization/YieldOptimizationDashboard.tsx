'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  Refresh,
  Brain,
  Shield,
  Award,
} from 'lucide-react';

interface OptimizationData {
  overview: {
    totalOpportunities: number;
    avgExpectedReturn: number;
    marketTrend: 'up' | 'down' | 'sideways';
    riskLevel: string;
  };
  trends: any;
  topOpportunities: any[];
  insights: string[];
  lastUpdated: Date;
}

interface PortfolioMetrics {
  totalValue: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskScore: number;
  diversificationRatio: number;
}

interface RebalanceRecommendation {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  expectedImpact: {
    riskReduction: number;
    returnImprovement: number;
    costEstimate: number;
  };
  allocations: Array<{
    strategyId: string;
    strategyName: string;
    currentWeight: number;
    recommendedWeight: number;
    change: number;
  }>;
}

export function YieldOptimizationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [rebalanceRec, setRebalanceRec] = useState<RebalanceRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(false);

  useEffect(() => {
    loadOptimizationData();
    loadPortfolioMetrics();
    loadRebalanceRecommendations();
  }, []);

  const loadOptimizationData = async () => {
    try {
      // Simulated data - in production, this would be API calls
      setOptimizationData({
        overview: {
          totalOpportunities: 15,
          avgExpectedReturn: 0.085,
          marketTrend: 'up',
          riskLevel: 'Medium',
        },
        trends: {
          predictions: { nextPeriodDirection: 'up', confidence: 0.78 },
          trends: {
            yieldRates: { trend: 'increasing', momentum: 'accelerating' },
            volatility: { trend: 'stable', momentum: 'steady' },
          },
        },
        topOpportunities: [
          {
            strategyName: 'Aave V3 USDC Lending',
            expectedReturn: 0.12,
            riskAdjustedReturn: 0.095,
            riskLevel: 'low',
            timeWindow: 24,
          },
          {
            strategyName: 'Compound cUSDT Strategy',
            expectedReturn: 0.105,
            riskAdjustedReturn: 0.088,
            riskLevel: 'medium',
            timeWindow: 48,
          },
          {
            strategyName: 'Yearn vUSDC Vault',
            expectedReturn: 0.098,
            riskAdjustedReturn: 0.082,
            riskLevel: 'low',
            timeWindow: 72,
          },
        ],
        insights: [
          '15 yield opportunities identified',
          'Market trend: up',
          'High opportunity environment - consider increasing allocations',
          'DeFi yields showing positive momentum',
        ],
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Failed to load optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioMetrics = async () => {
    try {
      setPortfolioMetrics({
        totalValue: 125000,
        volatility: 0.18,
        sharpeRatio: 1.45,
        maxDrawdown: 0.12,
        riskScore: 42,
        diversificationRatio: 1.32,
      });
    } catch (error) {
      console.error('Failed to load portfolio metrics:', error);
    }
  };

  const loadRebalanceRecommendations = async () => {
    try {
      setRebalanceRec({
        urgency: 'medium',
        reason: 'Suboptimal risk-return profile',
        expectedImpact: {
          riskReduction: 0.05,
          returnImprovement: 0.02,
          costEstimate: 125,
        },
        allocations: [
          {
            strategyId: 'aave-usdc',
            strategyName: 'Aave USDC',
            currentWeight: 0.35,
            recommendedWeight: 0.40,
            change: 0.05,
          },
          {
            strategyId: 'compound-usdt',
            strategyName: 'Compound USDT',
            currentWeight: 0.25,
            recommendedWeight: 0.30,
            change: 0.05,
          },
          {
            strategyId: 'yearn-vault',
            strategyName: 'Yearn Vault',
            currentWeight: 0.40,
            recommendedWeight: 0.30,
            change: -0.10,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to load rebalance recommendations:', error);
    }
  };

  const handleOptimizePortfolio = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadRebalanceRecommendations();
    } catch (error) {
      console.error('Failed to optimize portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRebalance = async () => {
    try {
      // Simulate rebalancing execution
      console.log('Executing rebalance...');
    } catch (error) {
      console.error('Failed to execute rebalance:', error);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !optimizationData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Yield Optimization</h1>
          <p className="text-gray-600 mt-1">AI-powered portfolio optimization and yield strategies</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => loadOptimizationData()}
            disabled={loading}
          >
            <Refresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleOptimizePortfolio} disabled={loading}>
            <Brain className="h-4 w-4 mr-2" />
            Optimize Portfolio
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {optimizationData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Opportunities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {optimizationData.overview.totalOpportunities}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Expected Return</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(optimizationData.overview.avgExpectedReturn * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Market Trend</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900 capitalize">
                      {optimizationData.overview.marketTrend}
                    </p>
                    {optimizationData.overview.marketTrend === 'up' && (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Risk Level</p>
                  <p className={`text-2xl font-bold ${getRiskColor(optimizationData.overview.riskLevel)}`}>
                    {optimizationData.overview.riskLevel}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Risk</TabsTrigger>
          <TabsTrigger value="rebalance">Rebalancing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Forecast */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: 'Jan', actual: 1000, forecast: 1000 },
                        { month: 'Feb', actual: 1050, forecast: 1045 },
                        { month: 'Mar', actual: 1120, forecast: 1095 },
                        { month: 'Apr', actual: null, forecast: 1150 },
                        { month: 'May', actual: null, forecast: 1210 },
                        { month: 'Jun', actual: null, forecast: 1275 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="actual"
                        stackId="1"
                        stroke="#2563eb"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        name="Actual"
                      />
                      <Area
                        type="monotone"
                        dataKey="forecast"
                        stackId="2"
                        stroke="#10b981"
                        fill="#34d399"
                        fillOpacity={0.3}
                        strokeDasharray="5 5"
                        name="Forecast"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            {portfolioMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Risk Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Volatility</span>
                      <span className="text-sm text-gray-600">
                        {(portfolioMetrics.volatility * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={portfolioMetrics.volatility * 100} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Risk Score</span>
                      <span className="text-sm text-gray-600">{portfolioMetrics.riskScore}/100</span>
                    </div>
                    <Progress value={portfolioMetrics.riskScore} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {portfolioMetrics.sharpeRatio.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-600">Sharpe Ratio</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {(portfolioMetrics.maxDrawdown * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600">Max Drawdown</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Insights */}
          {optimizationData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optimizationData.insights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Award className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          {optimizationData && (
            <Card>
              <CardHeader>
                <CardTitle>Top Yield Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationData.topOpportunities.map((opportunity, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{opportunity.strategyName}</h3>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="text-sm">
                              <span className="text-gray-600">Expected Return: </span>
                              <span className="font-medium text-green-600">
                                {(opportunity.expectedReturn * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Risk-Adjusted: </span>
                              <span className="font-medium">
                                {(opportunity.riskAdjustedReturn * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className={getRiskColor(opportunity.riskLevel)}
                            >
                              {opportunity.riskLevel}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Time Window</p>
                          <p className="font-semibold">{opportunity.timeWindow}h</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          {portfolioMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Aave USDC', value: 35, fill: '#3b82f6' },
                            { name: 'Compound USDT', value: 25, fill: '#10b981' },
                            { name: 'Yearn Vault', value: 40, fill: '#f59e0b' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Portfolio Value</span>
                      <span className="font-semibold">
                        ${portfolioMetrics.totalValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diversification Ratio</span>
                      <span className="font-semibold">{portfolioMetrics.diversificationRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volatility</span>
                      <span className="font-semibold">{(portfolioMetrics.volatility * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sharpe Ratio</span>
                      <span className="font-semibold text-green-600">
                        {portfolioMetrics.sharpeRatio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rebalance" className="space-y-6">
          {rebalanceRec && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rebalancing Recommendations</span>
                  <Badge className={getUrgencyColor(rebalanceRec.urgency)}>
                    {rebalanceRec.urgency} Priority
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Reason</h4>
                  <p className="text-blue-800">{rebalanceRec.reason}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {(rebalanceRec.expectedImpact.returnImprovement * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Return Improvement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {(rebalanceRec.expectedImpact.riskReduction * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Risk Reduction</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      ${rebalanceRec.expectedImpact.costEstimate}
                    </p>
                    <p className="text-sm text-gray-600">Estimated Cost</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Allocation Changes</h4>
                  {rebalanceRec.allocations.map((allocation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{allocation.strategyName}</p>
                        <p className="text-sm text-gray-600">
                          {(allocation.currentWeight * 100).toFixed(1)}% → {(allocation.recommendedWeight * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${allocation.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {allocation.change > 0 ? '+' : ''}{(allocation.change * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleExecuteRebalance}
                  className="w-full"
                  size="lg"
                >
                  Execute Rebalancing
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Optimization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Enable Auto-Optimization</h4>
                  <p className="text-sm text-gray-600">Automatically optimize portfolio based on ML recommendations</p>
                </div>
                <Button
                  variant={autoOptimizationEnabled ? "default" : "outline"}
                  onClick={() => setAutoOptimizationEnabled(!autoOptimizationEnabled)}
                >
                  {autoOptimizationEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              {autoOptimizationEnabled && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <h4 className="font-semibold mb-2">Optimization Frequency</h4>
                    <select className="w-full p-2 border rounded">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Risk Tolerance</h4>
                    <select className="w-full p-2 border rounded">
                      <option value="conservative">Conservative</option>
                      <option value="moderate">Moderate</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Rebalance Threshold</h4>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="5"
                      className="w-full"
                    />
                    <p className="text-sm text-gray-600 mt-1">5% - Rebalance when allocation drifts by this amount</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}