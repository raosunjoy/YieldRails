import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

// Predictive analytics types and interfaces
interface YieldForecast {
  strategyId: string;
  timeHorizon: '1d' | '7d' | '30d' | '90d' | '1y';
  predictions: {
    expectedApy: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  };
  scenarios: {
    optimistic: YieldScenario;
    realistic: YieldScenario;
    pessimistic: YieldScenario;
  };
  riskFactors: RiskFactor[];
  lastUpdated: Date;
}

interface YieldScenario {
  probability: number;
  expectedApy: number;
  maxDrawdown: number;
  volatility: number;
  timeToBreakeven: number;
  keyAssumptions: string[];
}

interface RiskFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0-1 scale
  probability: number; // 0-1 scale
  description: string;
}

interface MarketTrendAnalysis {
  period: '24h' | '7d' | '30d' | '90d';
  trends: {
    defiTvl: TrendData;
    yieldRates: TrendData;
    volatility: TrendData;
    liquidityFlow: TrendData;
    protocolAdoption: TrendData;
  };
  correlations: {
    yieldVsMarket: number;
    tvlVsYield: number;
    volatilityVsYield: number;
  };
  predictions: {
    nextPeriodDirection: 'up' | 'down' | 'sideways';
    confidence: number;
    keyDrivers: string[];
  };
}

interface TrendData {
  current: number;
  change: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  momentum: 'accelerating' | 'decelerating' | 'steady';
  support: number;
  resistance: number;
}

interface PerformanceAttribution {
  portfolioId: string;
  period: '1d' | '7d' | '30d' | '90d';
  totalReturn: number;
  breakdown: {
    assetAllocation: number;
    strategySelection: number;
    timing: number;
    fees: number;
    other: number;
  };
  topContributors: AttributionItem[];
  topDetractors: AttributionItem[];
  insights: string[];
}

interface AttributionItem {
  strategyId: string;
  strategyName: string;
  contribution: number;
  weight: number;
  return: number;
  reason: string;
}

interface YieldOpportunity {
  strategyId: string;
  strategyName: string;
  opportunityType: 'arbitrage' | 'new_protocol' | 'rate_spike' | 'risk_repricing';
  expectedReturn: number;
  riskAdjustedReturn: number;
  timeWindow: number; // hours
  probability: number;
  requirements: {
    minAmount: number;
    maxAmount: number;
    timeCommitment: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  reasoning: string[];
  expiresAt: Date;
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly FORECAST_MODELS = {
    arima: 'ARIMA',
    lstm: 'LSTM Neural Network',
    ensemble: 'Ensemble Model',
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate yield forecasts using predictive models
   */
  async generateYieldForecast(
    strategyId: string,
    timeHorizon: '1d' | '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<YieldForecast> {
    try {
      const cacheKey = `yield_forecast:${strategyId}:${timeHorizon}`;
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical data for the strategy
      const historicalData = await this.getStrategyHistoricalData(strategyId);
      
      // Get external market factors
      const marketFactors = await this.getMarketFactors();
      
      // Run predictive models
      const predictions = await this.runForecastModels(historicalData, marketFactors, timeHorizon);
      
      // Generate scenarios
      const scenarios = await this.generateYieldScenarios(strategyId, timeHorizon, predictions);
      
      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(strategyId, marketFactors);

      const forecast: YieldForecast = {
        strategyId,
        timeHorizon,
        predictions,
        scenarios,
        riskFactors,
        lastUpdated: new Date(),
      };

      // Cache results
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(forecast));

      this.logger.log(`Generated yield forecast for strategy ${strategyId} (${timeHorizon})`);
      return forecast;
    } catch (error) {
      this.logger.error('Failed to generate yield forecast:', error);
      throw error;
    }
  }

  /**
   * Analyze market trends and correlations
   */
  async analyzeMarketTrends(period: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<MarketTrendAnalysis> {
    try {
      const cacheKey = `market_trends:${period}`;
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get market data
      const marketData = await this.getMarketData(period);
      
      // Calculate trends
      const trends = {
        defiTvl: this.calculateTrend(marketData.tvlData),
        yieldRates: this.calculateTrend(marketData.yieldData),
        volatility: this.calculateTrend(marketData.volatilityData),
        liquidityFlow: this.calculateTrend(marketData.liquidityData),
        protocolAdoption: this.calculateTrend(marketData.adoptionData),
      };

      // Calculate correlations
      const correlations = {
        yieldVsMarket: this.calculateCorrelation(marketData.yieldData, marketData.marketData),
        tvlVsYield: this.calculateCorrelation(marketData.tvlData, marketData.yieldData),
        volatilityVsYield: this.calculateCorrelation(marketData.volatilityData, marketData.yieldData),
      };

      // Generate predictions
      const predictions = await this.predictMarketDirection(trends, correlations);

      const analysis: MarketTrendAnalysis = {
        period,
        trends,
        correlations,
        predictions,
      };

      // Cache results
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis));

      this.logger.log(`Analyzed market trends for period ${period}`);
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze market trends:', error);
      throw error;
    }
  }

  /**
   * Perform yield performance attribution analysis
   */
  async performAttributionAnalysis(
    portfolioId: string,
    period: '1d' | '7d' | '30d' | '90d' = '30d'
  ): Promise<PerformanceAttribution> {
    try {
      const portfolio = await this.getPortfolioPerformanceData(portfolioId, period);
      const benchmark = await this.getBenchmarkData(period);

      // Calculate total return
      const totalReturn = this.calculatePortfolioReturn(portfolio, period);

      // Perform attribution analysis
      const breakdown = await this.calculateAttributionBreakdown(portfolio, benchmark, period);
      
      // Identify top contributors and detractors
      const { topContributors, topDetractors } = this.identifyContributors(portfolio.positions);
      
      // Generate insights
      const insights = this.generateAttributionInsights(breakdown, topContributors, topDetractors);

      const attribution: PerformanceAttribution = {
        portfolioId,
        period,
        totalReturn,
        breakdown,
        topContributors,
        topDetractors,
        insights,
      };

      this.logger.log(`Performed attribution analysis for portfolio ${portfolioId} (${period})`);
      return attribution;
    } catch (error) {
      this.logger.error('Failed to perform attribution analysis:', error);
      throw error;
    }
  }

  /**
   * Identify yield opportunities using predictive analytics
   */
  async identifyYieldOpportunities(): Promise<YieldOpportunity[]> {
    try {
      const cacheKey = 'yield_opportunities';
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const opportunities: YieldOpportunity[] = [];

      // Check for arbitrage opportunities
      const arbitrageOpps = await this.findArbitrageOpportunities();
      opportunities.push(...arbitrageOpps);

      // Check for new protocol opportunities
      const newProtocolOpps = await this.findNewProtocolOpportunities();
      opportunities.push(...newProtocolOpps);

      // Check for rate spike opportunities
      const rateSpikeOpps = await this.findRateSpikeOpportunities();
      opportunities.push(...rateSpikeOpps);

      // Check for risk repricing opportunities
      const riskRepricingOpps = await this.findRiskRepricingOpportunities();
      opportunities.push(...riskRepricingOpps);

      // Sort by risk-adjusted return
      opportunities.sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn);

      // Cache results for 15 minutes (opportunities are time-sensitive)
      await this.redis.setex(cacheKey, 900, JSON.stringify(opportunities));

      this.logger.log(`Identified ${opportunities.length} yield opportunities`);
      return opportunities;
    } catch (error) {
      this.logger.error('Failed to identify yield opportunities:', error);
      throw error;
    }
  }

  /**
   * Continuous predictive model updates
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updatePredictiveModels(): Promise<void> {
    try {
      this.logger.log('Updating predictive models');

      // Update yield forecasts for all active strategies
      const strategies = await this.getActiveStrategies();
      
      for (const strategy of strategies) {
        try {
          // Update forecasts for different time horizons
          await this.generateYieldForecast(strategy.id, '1d');
          await this.generateYieldForecast(strategy.id, '7d');
          await this.generateYieldForecast(strategy.id, '30d');
          
        } catch (error) {
          this.logger.error(`Failed to update forecast for strategy ${strategy.id}:`, error);
        }
      }

      // Update market trend analysis
      await this.analyzeMarketTrends('24h');
      await this.analyzeMarketTrends('7d');
      await this.analyzeMarketTrends('30d');

      // Update yield opportunities
      await this.identifyYieldOpportunities();

      this.logger.log('Completed predictive model updates');
    } catch (error) {
      this.logger.error('Failed to update predictive models:', error);
    }
  }

  /**
   * Run forecast models (ARIMA, LSTM, Ensemble)
   */
  private async runForecastModels(
    historicalData: any,
    marketFactors: any,
    timeHorizon: string
  ): Promise<any> {
    // Simplified forecast logic - in production would use actual ML models
    const returns = historicalData.returns || [];
    const volatilities = historicalData.volatilities || [];
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const meanVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    
    // Adjust for market factors
    const marketAdjustment = this.calculateMarketAdjustment(marketFactors);
    const adjustedReturn = meanReturn * (1 + marketAdjustment);
    
    // Calculate confidence based on data quality and model agreement
    const confidence = Math.min(0.95, 0.6 + (returns.length / 365) * 0.3);
    
    // Calculate prediction intervals
    const uncertainty = meanVolatility * Math.sqrt(this.getTimeHorizonDays(timeHorizon) / 365);
    
    return {
      expectedApy: adjustedReturn,
      confidence,
      upperBound: adjustedReturn + 1.96 * uncertainty,
      lowerBound: adjustedReturn - 1.96 * uncertainty,
    };
  }

  /**
   * Generate yield scenarios (optimistic, realistic, pessimistic)
   */
  private async generateYieldScenarios(
    strategyId: string,
    timeHorizon: string,
    predictions: any
  ): Promise<any> {
    const baseReturn = predictions.expectedApy;
    const uncertainty = (predictions.upperBound - predictions.lowerBound) / 4;

    return {
      optimistic: {
        probability: 0.25,
        expectedApy: baseReturn + uncertainty,
        maxDrawdown: 0.05,
        volatility: uncertainty * 0.8,
        timeToBreakeven: 30,
        keyAssumptions: [
          'Favorable market conditions persist',
          'No major protocol issues',
          'Continued DeFi adoption growth',
        ],
      },
      realistic: {
        probability: 0.5,
        expectedApy: baseReturn,
        maxDrawdown: 0.10,
        volatility: uncertainty,
        timeToBreakeven: 60,
        keyAssumptions: [
          'Normal market volatility',
          'Steady protocol performance',
          'Moderate growth in DeFi space',
        ],
      },
      pessimistic: {
        probability: 0.25,
        expectedApy: baseReturn - uncertainty,
        maxDrawdown: 0.20,
        volatility: uncertainty * 1.5,
        timeToBreakeven: 120,
        keyAssumptions: [
          'Increased market volatility',
          'Potential protocol issues',
          'Regulatory headwinds',
        ],
      },
    };
  }

  /**
   * Identify risk factors affecting yield predictions
   */
  private async identifyRiskFactors(strategyId: string, marketFactors: any): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Market volatility
    if (marketFactors.volatility > 0.3) {
      riskFactors.push({
        factor: 'high_market_volatility',
        impact: 'negative',
        magnitude: Math.min(1, marketFactors.volatility / 0.5),
        probability: 0.8,
        description: 'High market volatility may reduce yield stability',
      });
    }

    // Liquidity conditions
    if (marketFactors.liquidityIndex < 0.5) {
      riskFactors.push({
        factor: 'low_liquidity',
        impact: 'negative',
        magnitude: 1 - marketFactors.liquidityIndex,
        probability: 0.7,
        description: 'Low liquidity may impact yield generation and exit opportunities',
      });
    }

    // Protocol concentration
    const protocolRisk = await this.getProtocolConcentrationRisk(strategyId);
    if (protocolRisk > 0.6) {
      riskFactors.push({
        factor: 'protocol_concentration',
        impact: 'negative',
        magnitude: protocolRisk,
        probability: 0.6,
        description: 'High concentration in specific protocols increases smart contract risk',
      });
    }

    // Regulatory environment
    if (marketFactors.regulatoryRisk > 0.4) {
      riskFactors.push({
        factor: 'regulatory_uncertainty',
        impact: 'negative',
        magnitude: marketFactors.regulatoryRisk,
        probability: 0.5,
        description: 'Regulatory uncertainty may impact DeFi protocol operations',
      });
    }

    return riskFactors;
  }

  /**
   * Calculate trend data from time series
   */
  private calculateTrend(data: number[]): TrendData {
    if (data.length < 2) {
      return {
        current: data[0] || 0,
        change: 0,
        changePercent: 0,
        trend: 'stable',
        momentum: 'steady',
        support: data[0] || 0,
        resistance: data[0] || 0,
      };
    }

    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // Calculate trend
    const recentSlope = this.calculateSlope(data.slice(-10));
    const trend = recentSlope > 0.01 ? 'increasing' : recentSlope < -0.01 ? 'decreasing' : 'stable';

    // Calculate momentum
    const oldSlope = this.calculateSlope(data.slice(-20, -10));
    const momentum = recentSlope > oldSlope ? 'accelerating' : 
                    recentSlope < oldSlope ? 'decelerating' : 'steady';

    // Calculate support and resistance
    const support = Math.min(...data.slice(-30));
    const resistance = Math.max(...data.slice(-30));

    return {
      current,
      change,
      changePercent,
      trend,
      momentum,
      support,
      resistance,
    };
  }

  /**
   * Calculate correlation between two data series
   */
  private calculateCorrelation(data1: number[], data2: number[]): number {
    if (data1.length !== data2.length || data1.length < 2) {
      return 0;
    }

    const mean1 = data1.reduce((sum, val) => sum + val, 0) / data1.length;
    const mean2 = data2.reduce((sum, val) => sum + val, 0) / data2.length;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < data1.length; i++) {
      const diff1 = data1[i] - mean1;
      const diff2 = data2[i] - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate slope of data series
   */
  private calculateSlope(data: number[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, index) => sum + index * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * Helper methods for data retrieval
   */
  private async getStrategyHistoricalData(strategyId: string): Promise<any> {
    // Simplified - in production would fetch real historical data
    return {
      returns: Array.from({ length: 365 }, () => Math.random() * 0.2 - 0.1),
      volatilities: Array.from({ length: 365 }, () => Math.random() * 0.3),
      volumes: Array.from({ length: 365 }, () => Math.random() * 1000000),
    };
  }

  private async getMarketFactors(): Promise<any> {
    // Simplified - in production would fetch real market data
    return {
      volatility: 0.25,
      liquidityIndex: 0.7,
      fearGreedIndex: 60,
      defiTvl: 50000000000, // $50B
      regulatoryRisk: 0.3,
    };
  }

  private async getMarketData(period: string): Promise<any> {
    // Simplified - in production would fetch real market data
    const generateData = (length: number) => 
      Array.from({ length }, () => Math.random() * 100);

    return {
      tvlData: generateData(this.getPeriodLength(period)),
      yieldData: generateData(this.getPeriodLength(period)),
      volatilityData: generateData(this.getPeriodLength(period)),
      liquidityData: generateData(this.getPeriodLength(period)),
      adoptionData: generateData(this.getPeriodLength(period)),
      marketData: generateData(this.getPeriodLength(period)),
    };
  }

  private getPeriodLength(period: string): number {
    switch (period) {
      case '24h': return 24;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  }

  private getTimeHorizonDays(timeHorizon: string): number {
    switch (timeHorizon) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private calculateMarketAdjustment(marketFactors: any): number {
    // Simplified market adjustment calculation
    const volatilityAdjustment = (0.3 - marketFactors.volatility) * 0.2;
    const liquidityAdjustment = (marketFactors.liquidityIndex - 0.5) * 0.1;
    const regulatoryAdjustment = -marketFactors.regulatoryRisk * 0.15;

    return volatilityAdjustment + liquidityAdjustment + regulatoryAdjustment;
  }

  private async getProtocolConcentrationRisk(strategyId: string): Promise<number> {
    // Simplified - in production would calculate real concentration
    return Math.random() * 0.8; // 0-80% concentration risk
  }

  private async predictMarketDirection(trends: any, correlations: any): Promise<any> {
    // Simplified prediction logic
    const trendScores = Object.values(trends).map((trend: any) => {
      switch (trend.trend) {
        case 'increasing': return 1;
        case 'decreasing': return -1;
        default: return 0;
      }
    });

    const avgTrendScore = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;
    
    return {
      nextPeriodDirection: avgTrendScore > 0.1 ? 'up' : avgTrendScore < -0.1 ? 'down' : 'sideways',
      confidence: Math.abs(avgTrendScore) * 0.8,
      keyDrivers: ['DeFi TVL growth', 'Market sentiment', 'Yield rate trends'],
    };
  }

  // Simplified opportunity identification methods
  private async findArbitrageOpportunities(): Promise<YieldOpportunity[]> {
    return [{
      strategyId: 'arb-001',
      strategyName: 'Cross-DEX Arbitrage',
      opportunityType: 'arbitrage',
      expectedReturn: 0.15,
      riskAdjustedReturn: 0.12,
      timeWindow: 2,
      probability: 0.8,
      requirements: {
        minAmount: 1000,
        maxAmount: 50000,
        timeCommitment: 2,
        riskLevel: 'low',
      },
      reasoning: ['Price discrepancy between DEXs', 'High liquidity available'],
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    }];
  }

  private async findNewProtocolOpportunities(): Promise<YieldOpportunity[]> {
    return [{
      strategyId: 'new-001',
      strategyName: 'New Protocol Launch',
      opportunityType: 'new_protocol',
      expectedReturn: 0.25,
      riskAdjustedReturn: 0.15,
      timeWindow: 48,
      probability: 0.6,
      requirements: {
        minAmount: 5000,
        maxAmount: 100000,
        timeCommitment: 48,
        riskLevel: 'medium',
      },
      reasoning: ['New protocol with incentives', 'First mover advantage'],
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    }];
  }

  private async findRateSpikeOpportunities(): Promise<YieldOpportunity[]> {
    return [];
  }

  private async findRiskRepricingOpportunities(): Promise<YieldOpportunity[]> {
    return [];
  }

  private async getActiveStrategies(): Promise<any[]> {
    return await this.prisma.yieldStrategy.findMany({
      where: { isActive: true },
    });
  }

  private async getPortfolioPerformanceData(portfolioId: string, period: string): Promise<any> {
    // Simplified - in production would fetch real performance data
    return {
      id: portfolioId,
      totalReturn: Math.random() * 0.2 - 0.1,
      positions: [
        { strategyId: 'str-1', weight: 0.4, return: 0.08 },
        { strategyId: 'str-2', weight: 0.3, return: 0.12 },
        { strategyId: 'str-3', weight: 0.3, return: 0.05 },
      ],
    };
  }

  private async getBenchmarkData(period: string): Promise<any> {
    return {
      return: 0.06, // 6% benchmark return
    };
  }

  private calculatePortfolioReturn(portfolio: any, period: string): number {
    return portfolio.totalReturn;
  }

  private async calculateAttributionBreakdown(portfolio: any, benchmark: any, period: string): Promise<any> {
    return {
      assetAllocation: 0.02,
      strategySelection: 0.03,
      timing: -0.005,
      fees: -0.01,
      other: 0.005,
    };
  }

  private identifyContributors(positions: any[]): { topContributors: AttributionItem[], topDetractors: AttributionItem[] } {
    const contributors = positions.map(pos => ({
      strategyId: pos.strategyId,
      strategyName: `Strategy ${pos.strategyId}`,
      contribution: pos.weight * pos.return,
      weight: pos.weight,
      return: pos.return,
      reason: pos.return > 0.06 ? 'Outperformed benchmark' : 'Underperformed benchmark',
    }));

    return {
      topContributors: contributors.filter(c => c.contribution > 0).slice(0, 3),
      topDetractors: contributors.filter(c => c.contribution < 0).slice(0, 3),
    };
  }

  private generateAttributionInsights(breakdown: any, contributors: any[], detractors: any[]): string[] {
    const insights = [];

    if (breakdown.strategySelection > 0.02) {
      insights.push('Strong strategy selection contributed positively to returns');
    }

    if (breakdown.timing < -0.01) {
      insights.push('Market timing had a negative impact on performance');
    }

    if (contributors.length > 0) {
      insights.push(`Top performing strategy: ${contributors[0].strategyName}`);
    }

    return insights;
  }
}