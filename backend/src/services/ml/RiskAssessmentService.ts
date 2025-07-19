import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { YieldOptimizationMLService } from './YieldOptimizationML';

// Risk assessment types and interfaces
interface RiskProfile {
  userId: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: '1d' | '7d' | '30d' | '90d' | '1y';
  liquidityRequirement: 'high' | 'medium' | 'low';
  maxDrawdown: number;
  targetReturn: number;
  constraints: RiskConstraint[];
  lastUpdated: Date;
}

interface RiskConstraint {
  type: 'max_allocation' | 'min_allocation' | 'no_leverage' | 'specific_protocols';
  value: number | string | boolean;
  description: string;
}

interface PortfolioRiskMetrics {
  portfolioId: string;
  totalValue: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: {
    var95: number;
    var99: number;
    expectedShortfall: number;
  };
  diversificationRatio: number;
  concentrationRisk: number;
  liquidityRisk: number;
  protocolRisk: number;
  correlationMatrix: number[][];
  riskScore: number; // 0-100
  lastCalculated: Date;
}

interface RebalanceRecommendation {
  portfolioId: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  currentAllocation: AllocationItem[];
  recommendedAllocation: AllocationItem[];
  expectedImpact: {
    riskReduction: number;
    returnImprovement: number;
    costEstimate: number;
  };
  timeframe: '1d' | '3d' | '7d';
  confidence: number;
}

interface AllocationItem {
  strategyId: string;
  strategyName: string;
  currentWeight: number;
  recommendedWeight: number;
  change: number;
  reasoning: string[];
}

interface StressTestResult {
  scenario: string;
  description: string;
  portfolioImpact: number;
  timeToRecover: number;
  worstCaseDrawdown: number;
  liquidityImpact: number;
  protocolFailures: string[];
  mitigationStrategies: string[];
}

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly RISK_TOLERANCE_THRESHOLDS = {
    conservative: { maxVol: 0.15, maxDrawdown: 0.10, maxConcentration: 0.30 },
    moderate: { maxVol: 0.25, maxDrawdown: 0.20, maxConcentration: 0.50 },
    aggressive: { maxVol: 0.40, maxDrawdown: 0.35, maxConcentration: 0.70 },
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
    private mlService: YieldOptimizationMLService,
  ) {}

  /**
   * Assess comprehensive portfolio risk metrics
   */
  async assessPortfolioRisk(portfolioId: string): Promise<PortfolioRiskMetrics> {
    try {
      const cacheKey = `portfolio_risk:${portfolioId}`;
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get portfolio data
      const portfolio = await this.getPortfolioDetails(portfolioId);
      const positions = portfolio.positions;

      // Calculate risk metrics
      const riskMetrics: PortfolioRiskMetrics = {
        portfolioId,
        totalValue: portfolio.totalValue,
        volatility: await this.calculatePortfolioVolatility(positions),
        sharpeRatio: await this.calculatePortfolioSharpeRatio(positions),
        maxDrawdown: await this.calculatePortfolioMaxDrawdown(positions),
        valueAtRisk: await this.calculateValueAtRisk(positions),
        diversificationRatio: this.calculateDiversificationRatio(positions),
        concentrationRisk: this.calculateConcentrationRisk(positions),
        liquidityRisk: await this.calculateLiquidityRisk(positions),
        protocolRisk: await this.calculateProtocolRisk(positions),
        correlationMatrix: await this.calculateCorrelationMatrix(positions),
        riskScore: 0, // Will be calculated below
        lastCalculated: new Date(),
      };

      // Calculate overall risk score (0-100)
      riskMetrics.riskScore = this.calculateOverallRiskScore(riskMetrics);

      // Cache results
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(riskMetrics));

      this.logger.log(`Calculated risk metrics for portfolio ${portfolioId}`);
      return riskMetrics;
    } catch (error) {
      this.logger.error('Failed to assess portfolio risk:', error);
      throw error;
    }
  }

  /**
   * Generate portfolio rebalancing recommendations
   */
  async generateRebalanceRecommendations(portfolioId: string): Promise<RebalanceRecommendation> {
    try {
      const portfolio = await this.getPortfolioDetails(portfolioId);
      const userProfile = await this.getUserRiskProfile(portfolio.userId);
      const currentRisk = await this.assessPortfolioRisk(portfolioId);

      // Check if rebalancing is needed
      const rebalanceNeed = this.assessRebalanceNeed(currentRisk, userProfile);
      
      if (rebalanceNeed.urgency === 'low' && !rebalanceNeed.forceRebalance) {
        return null; // No rebalancing needed
      }

      // Get ML-optimized allocation
      const mlRecommendation = await this.mlService.optimizePortfolioAllocation(
        portfolio.userId,
        userProfile.targetReturn,
        this.getRiskLimit(userProfile.riskTolerance)
      );

      // Create rebalance recommendation
      const recommendation: RebalanceRecommendation = {
        portfolioId,
        urgency: rebalanceNeed.urgency,
        reason: rebalanceNeed.reason,
        currentAllocation: this.mapToAllocationItems(portfolio.positions, 'current'),
        recommendedAllocation: this.mapToAllocationItems(mlRecommendation.allocations, 'recommended'),
        expectedImpact: await this.calculateRebalanceImpact(portfolio, mlRecommendation),
        timeframe: this.getRebalanceTimeframe(rebalanceNeed.urgency),
        confidence: mlRecommendation.confidenceScore || 0.8,
      };

      this.logger.log(`Generated rebalance recommendation for portfolio ${portfolioId}`);
      return recommendation;
    } catch (error) {
      this.logger.error('Failed to generate rebalance recommendations:', error);
      throw error;
    }
  }

  /**
   * Perform stress testing on portfolio
   */
  async performStressTesting(portfolioId: string): Promise<StressTestResult[]> {
    try {
      const portfolio = await this.getPortfolioDetails(portfolioId);
      const positions = portfolio.positions;

      const stressScenarios = [
        {
          name: 'market_crash_2008',
          description: '2008 Financial Crisis Scenario',
          marketMove: -0.40,
          correlationIncrease: 0.8,
          liquidityDrying: 0.6,
        },
        {
          name: 'defi_black_swan',
          description: 'Major DeFi Protocol Failure',
          protocolFailureRate: 0.15,
          contagionEffect: 0.3,
          liquidityShock: 0.5,
        },
        {
          name: 'crypto_winter',
          description: 'Extended Crypto Bear Market',
          marketMove: -0.60,
          volumeDecline: 0.7,
          yieldCollapse: 0.8,
        },
        {
          name: 'flash_crash',
          description: 'Sudden Liquidity Crisis',
          marketMove: -0.20,
          timeframe: '1d',
          liquidityShock: 0.9,
        },
        {
          name: 'regulatory_shock',
          description: 'Major Regulatory Crackdown',
          accessibilityReduction: 0.4,
          complianceCosts: 0.15,
          marketMove: -0.25,
        },
      ];

      const results: StressTestResult[] = [];

      for (const scenario of stressScenarios) {
        const result = await this.runStressScenario(positions, scenario);
        results.push(result);
      }

      this.logger.log(`Completed stress testing for portfolio ${portfolioId}`);
      return results;
    } catch (error) {
      this.logger.error('Failed to perform stress testing:', error);
      throw error;
    }
  }

  /**
   * Monitor portfolio risk in real-time
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorPortfolioRisks(): Promise<void> {
    try {
      this.logger.log('Starting portfolio risk monitoring');

      // Get all active portfolios
      const portfolios = await this.getActivePortfolios();

      for (const portfolio of portfolios) {
        try {
          // Calculate current risk metrics
          const riskMetrics = await this.assessPortfolioRisk(portfolio.id);
          
          // Check for risk threshold breaches
          await this.checkRiskThresholds(portfolio, riskMetrics);
          
          // Generate alerts if needed
          await this.generateRiskAlerts(portfolio, riskMetrics);
          
        } catch (error) {
          this.logger.error(`Failed to monitor portfolio ${portfolio.id}:`, error);
        }
      }

      this.logger.log('Completed portfolio risk monitoring');
    } catch (error) {
      this.logger.error('Failed portfolio risk monitoring:', error);
    }
  }

  /**
   * Calculate portfolio volatility
   */
  private async calculatePortfolioVolatility(positions: any[]): Promise<number> {
    const weights = positions.map(p => p.weight);
    const volatilities = await Promise.all(
      positions.map(p => this.getAssetVolatility(p.strategyId))
    );

    // Calculate weighted portfolio volatility
    let portfolioVariance = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        const correlation = i === j ? 1 : await this.getAssetCorrelation(
          positions[i].strategyId,
          positions[j].strategyId
        );
        portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
      }
    }

    return Math.sqrt(portfolioVariance);
  }

  /**
   * Calculate portfolio Sharpe ratio
   */
  private async calculatePortfolioSharpeRatio(positions: any[]): Promise<number> {
    const weights = positions.map(p => p.weight);
    const returns = await Promise.all(
      positions.map(p => this.getAssetReturn(p.strategyId))
    );

    const portfolioReturn = weights.reduce((sum, weight, i) => sum + weight * returns[i], 0);
    const portfolioVolatility = await this.calculatePortfolioVolatility(positions);
    const riskFreeRate = 0.02; // 2% risk-free rate

    return (portfolioReturn - riskFreeRate) / portfolioVolatility;
  }

  /**
   * Calculate portfolio maximum drawdown
   */
  private async calculatePortfolioMaxDrawdown(positions: any[]): Promise<number> {
    const historicalValues = await this.getPortfolioHistoricalValues(positions);
    
    let maxDrawdown = 0;
    let peak = historicalValues[0];
    
    for (const value of historicalValues) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private async calculateValueAtRisk(positions: any[]): Promise<{
    var95: number;
    var99: number;
    expectedShortfall: number;
  }> {
    const historicalReturns = await this.getPortfolioHistoricalReturns(positions);
    const sortedReturns = historicalReturns.sort((a, b) => a - b);
    
    const var95Index = Math.floor(0.05 * sortedReturns.length);
    const var99Index = Math.floor(0.01 * sortedReturns.length);
    
    const var95 = -sortedReturns[var95Index];
    const var99 = -sortedReturns[var99Index];
    
    // Expected Shortfall (Conditional VaR)
    const tailReturns = sortedReturns.slice(0, var95Index);
    const expectedShortfall = -tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;

    return { var95, var99, expectedShortfall };
  }

  /**
   * Calculate diversification ratio
   */
  private calculateDiversificationRatio(positions: any[]): number {
    const weights = positions.map(p => p.weight);
    const weightedAvgVol = weights.reduce((sum, weight, i) => 
      sum + weight * (positions[i].volatility || 0.2), 0);
    
    // Simplified calculation - in production would use full covariance matrix
    const portfolioVol = weightedAvgVol * 0.8; // Assuming some diversification benefit
    
    return weightedAvgVol / portfolioVol;
  }

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(positions: any[]): number {
    const weights = positions.map(p => p.weight);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    return herfindahlIndex; // Higher = more concentrated
  }

  /**
   * Calculate liquidity risk
   */
  private async calculateLiquidityRisk(positions: any[]): Promise<number> {
    const liquidityScores = await Promise.all(
      positions.map(p => this.getAssetLiquidityScore(p.strategyId))
    );
    
    const weights = positions.map(p => p.weight);
    const weightedLiquidity = weights.reduce((sum, weight, i) => 
      sum + weight * liquidityScores[i], 0);
    
    return 1 - weightedLiquidity; // Higher = more liquidity risk
  }

  /**
   * Calculate protocol risk
   */
  private async calculateProtocolRisk(positions: any[]): Promise<number> {
    const protocolScores = await Promise.all(
      positions.map(p => this.getProtocolRiskScore(p.strategyId))
    );
    
    const weights = positions.map(p => p.weight);
    const weightedRisk = weights.reduce((sum, weight, i) => 
      sum + weight * protocolScores[i], 0);
    
    return weightedRisk;
  }

  /**
   * Calculate correlation matrix
   */
  private async calculateCorrelationMatrix(positions: any[]): Promise<number[][]> {
    const n = positions.length;
    const correlationMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
        } else {
          correlationMatrix[i][j] = await this.getAssetCorrelation(
            positions[i].strategyId,
            positions[j].strategyId
          );
        }
      }
    }
    
    return correlationMatrix;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(metrics: PortfolioRiskMetrics): number {
    const scores = {
      volatility: Math.min(100, (metrics.volatility / 0.5) * 100),
      concentration: metrics.concentrationRisk * 100,
      liquidity: metrics.liquidityRisk * 100,
      protocol: metrics.protocolRisk * 100,
      drawdown: (metrics.maxDrawdown / 0.5) * 100,
    };

    // Weighted average
    const weights = { volatility: 0.25, concentration: 0.2, liquidity: 0.2, protocol: 0.2, drawdown: 0.15 };
    
    return Object.keys(scores).reduce((sum, key) => 
      sum + scores[key] * weights[key], 0);
  }

  /**
   * Assess rebalance need
   */
  private assessRebalanceNeed(riskMetrics: PortfolioRiskMetrics, userProfile: RiskProfile): {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    forceRebalance: boolean;
  } {
    const thresholds = this.RISK_TOLERANCE_THRESHOLDS[userProfile.riskTolerance];
    
    // Critical: Major risk threshold breaches
    if (riskMetrics.volatility > thresholds.maxVol * 1.5 || 
        riskMetrics.maxDrawdown > thresholds.maxDrawdown * 1.5 ||
        riskMetrics.concentrationRisk > thresholds.maxConcentration * 1.3) {
      return {
        urgency: 'critical',
        reason: 'Major risk thresholds exceeded',
        forceRebalance: true,
      };
    }

    // High: Risk threshold breaches
    if (riskMetrics.volatility > thresholds.maxVol || 
        riskMetrics.maxDrawdown > thresholds.maxDrawdown ||
        riskMetrics.concentrationRisk > thresholds.maxConcentration) {
      return {
        urgency: 'high',
        reason: 'Risk thresholds exceeded',
        forceRebalance: true,
      };
    }

    // Medium: Suboptimal allocation
    if (riskMetrics.diversificationRatio < 1.2 || riskMetrics.sharpeRatio < 0.5) {
      return {
        urgency: 'medium',
        reason: 'Suboptimal risk-return profile',
        forceRebalance: false,
      };
    }

    return {
      urgency: 'low',
      reason: 'Portfolio within acceptable parameters',
      forceRebalance: false,
    };
  }

  /**
   * Helper methods for data retrieval and calculations
   */
  private async getPortfolioDetails(portfolioId: string): Promise<any> {
    return await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        positions: {
          include: {
            strategy: true,
          },
        },
        user: true,
      },
    });
  }

  private async getUserRiskProfile(userId: string): Promise<RiskProfile> {
    const profile = await this.prisma.userRiskProfile.findUnique({
      where: { userId },
    });

    return profile || {
      userId,
      riskTolerance: 'moderate',
      timeHorizon: '30d',
      liquidityRequirement: 'medium',
      maxDrawdown: 0.2,
      targetReturn: 0.08,
      constraints: [],
      lastUpdated: new Date(),
    };
  }

  private getRiskLimit(riskTolerance: string): number {
    return this.RISK_TOLERANCE_THRESHOLDS[riskTolerance]?.maxVol || 0.25;
  }

  private mapToAllocationItems(items: any[], type: 'current' | 'recommended'): AllocationItem[] {
    return items.map(item => ({
      strategyId: item.strategyId,
      strategyName: item.strategyName || item.strategy?.name || 'Unknown',
      currentWeight: type === 'current' ? item.weight : item.currentAllocation,
      recommendedWeight: type === 'recommended' ? item.weight : item.recommendedAllocation,
      change: (type === 'recommended' ? item.weight : item.recommendedAllocation) - 
              (type === 'current' ? item.weight : item.currentAllocation),
      reasoning: item.reasoning || [],
    }));
  }

  private async calculateRebalanceImpact(portfolio: any, recommendation: any): Promise<any> {
    // Simplified impact calculation
    return {
      riskReduction: 0.05, // 5% risk reduction
      returnImprovement: 0.02, // 2% return improvement
      costEstimate: portfolio.totalValue * 0.001, // 0.1% transaction cost
    };
  }

  private getRebalanceTimeframe(urgency: string): '1d' | '3d' | '7d' {
    switch (urgency) {
      case 'critical': return '1d';
      case 'high': return '3d';
      default: return '7d';
    }
  }

  private async runStressScenario(positions: any[], scenario: any): Promise<StressTestResult> {
    // Simplified stress testing logic
    const portfolioImpact = scenario.marketMove || -0.2;
    const timeToRecover = Math.abs(portfolioImpact) * 365; // Days to recover
    
    return {
      scenario: scenario.name,
      description: scenario.description,
      portfolioImpact,
      timeToRecover,
      worstCaseDrawdown: Math.abs(portfolioImpact) * 1.2,
      liquidityImpact: scenario.liquidityShock || 0.1,
      protocolFailures: scenario.protocolFailureRate > 0 ? ['Protocol A', 'Protocol B'] : [],
      mitigationStrategies: [
        'Increase diversification',
        'Reduce position sizes',
        'Add hedging strategies',
      ],
    };
  }

  private async getActivePortfolios(): Promise<any[]> {
    return await this.prisma.portfolio.findMany({
      where: { isActive: true },
      include: {
        positions: true,
        user: true,
      },
    });
  }

  private async checkRiskThresholds(portfolio: any, metrics: PortfolioRiskMetrics): Promise<void> {
    const userProfile = await this.getUserRiskProfile(portfolio.userId);
    const thresholds = this.RISK_TOLERANCE_THRESHOLDS[userProfile.riskTolerance];
    
    if (metrics.volatility > thresholds.maxVol) {
      await this.createRiskAlert(portfolio.id, 'volatility_breach', metrics.volatility);
    }
    
    if (metrics.concentrationRisk > thresholds.maxConcentration) {
      await this.createRiskAlert(portfolio.id, 'concentration_risk', metrics.concentrationRisk);
    }
  }

  private async generateRiskAlerts(portfolio: any, metrics: PortfolioRiskMetrics): Promise<void> {
    if (metrics.riskScore > 80) {
      await this.createRiskAlert(portfolio.id, 'high_risk_score', metrics.riskScore);
    }
  }

  private async createRiskAlert(portfolioId: string, type: string, value: number): Promise<void> {
    await this.prisma.riskAlert.create({
      data: {
        portfolioId,
        alertType: type,
        severity: value > 0.8 ? 'high' : value > 0.5 ? 'medium' : 'low',
        value,
        message: `Risk threshold exceeded: ${type}`,
        isResolved: false,
      },
    });

    this.logger.warn(`Risk alert created for portfolio ${portfolioId}: ${type} = ${value}`);
  }

  // Asset data helper methods (simplified implementations)
  private async getAssetVolatility(strategyId: string): Promise<number> {
    // In production, this would fetch real historical data
    return 0.2; // 20% default volatility
  }

  private async getAssetReturn(strategyId: string): Promise<number> {
    // In production, this would fetch real historical returns
    return 0.08; // 8% default return
  }

  private async getAssetCorrelation(strategyId1: string, strategyId2: string): Promise<number> {
    // In production, this would calculate real correlations
    return strategyId1 === strategyId2 ? 1 : 0.3; // 30% default correlation
  }

  private async getAssetLiquidityScore(strategyId: string): Promise<number> {
    // In production, this would assess real liquidity
    return 0.7; // 70% default liquidity score
  }

  private async getProtocolRiskScore(strategyId: string): Promise<number> {
    // In production, this would assess protocol risks
    return 0.2; // 20% default protocol risk
  }

  private async getPortfolioHistoricalValues(positions: any[]): Promise<number[]> {
    // In production, this would fetch real historical data
    const values = [];
    let currentValue = 1000000; // $1M starting value
    
    for (let i = 0; i < 365; i++) {
      currentValue *= (1 + (Math.random() - 0.5) * 0.02); // Random daily change
      values.push(currentValue);
    }
    
    return values;
  }

  private async getPortfolioHistoricalReturns(positions: any[]): Promise<number[]> {
    const values = await this.getPortfolioHistoricalValues(positions);
    const returns = [];
    
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i-1]) / values[i-1]);
    }
    
    return returns;
  }
}