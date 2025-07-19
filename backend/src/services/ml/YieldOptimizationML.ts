import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

// ML-related types and interfaces
interface MLFeatureVector {
  historicalApy: number[];
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  liquidityScore: number;
  protocolTrustScore: number;
  timeInMarket: number;
  correlationMatrix: number[][];
  marketConditions: MarketCondition;
  riskScore: number;
}

interface MarketCondition {
  volatilityRegime: 'low' | 'medium' | 'high';
  trendDirection: 'bullish' | 'bearish' | 'sideways';
  liquidityIndex: number;
  fearGreedIndex: number;
  defiTvlTrend: number;
}

interface OptimizationResult {
  strategyId: string;
  recommendedAllocation: number;
  confidenceScore: number;
  expectedReturn: number;
  expectedRisk: number;
  reasoning: string[];
  timeHorizon: '1d' | '7d' | '30d' | '90d';
}

interface PortfolioAllocation {
  userId: string;
  allocations: {
    strategyId: string;
    currentAllocation: number;
    recommendedAllocation: number;
    rebalanceAmount: number;
  }[];
  totalValue: number;
  expectedReturn: number;
  expectedRisk: number;
  diversificationScore: number;
}

@Injectable()
export class YieldOptimizationMLService {
  private readonly logger = new Logger(YieldOptimizationMLService.name);
  private mlModel: any = null;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MODEL_VERSION = '1.0.0';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * Initialize ML model and training data
   */
  async initializeMLModel(): Promise<void> {
    try {
      this.logger.log('Initializing ML model for yield optimization');
      
      // Load historical data for training
      const historicalData = await this.loadHistoricalYieldData();
      
      // Initialize model with historical data
      this.mlModel = new YieldOptimizationModel();
      await this.mlModel.initialize(historicalData);
      
      this.logger.log('ML model initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ML model:', error);
      throw error;
    }
  }

  /**
   * Generate ML-powered yield optimization recommendations
   */
  async generateOptimizationRecommendations(
    userId: string,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive',
    timeHorizon: '1d' | '7d' | '30d' | '90d' = '30d'
  ): Promise<OptimizationResult[]> {
    try {
      const cacheKey = `ml_optimization:${userId}:${riskTolerance}:${timeHorizon}`;
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user's current portfolio
      const userPortfolio = await this.getUserPortfolio(userId);
      
      // Get available strategies
      const strategies = await this.getAvailableStrategies();
      
      // Build feature vectors for each strategy
      const featureVectors = await Promise.all(
        strategies.map(strategy => this.buildFeatureVector(strategy))
      );

      // Get current market conditions
      const marketConditions = await this.getCurrentMarketConditions();

      // Generate ML predictions
      const recommendations = await this.mlModel.predict({
        featureVectors,
        marketConditions,
        riskTolerance,
        timeHorizon,
        currentPortfolio: userPortfolio,
      });

      // Apply risk constraints and validation
      const validatedRecommendations = this.applyRiskConstraints(
        recommendations,
        riskTolerance,
        userPortfolio
      );

      // Cache results
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(validatedRecommendations));

      this.logger.log(`Generated ${validatedRecommendations.length} ML recommendations for user ${userId}`);
      return validatedRecommendations;
    } catch (error) {
      this.logger.error('Failed to generate ML recommendations:', error);
      throw error;
    }
  }

  /**
   * Optimize portfolio allocation using ML algorithms
   */
  async optimizePortfolioAllocation(
    userId: string,
    targetReturn?: number,
    maxRisk?: number
  ): Promise<PortfolioAllocation> {
    try {
      const currentPortfolio = await this.getUserPortfolio(userId);
      const userProfile = await this.getUserRiskProfile(userId);
      
      // Get optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(
        userId,
        userProfile.riskTolerance,
        userProfile.preferredTimeHorizon
      );

      // Use Modern Portfolio Theory with ML enhancements
      const optimizedAllocation = await this.modernPortfolioOptimization({
        currentPortfolio,
        recommendations,
        targetReturn,
        maxRisk,
        userConstraints: userProfile.constraints,
      });

      // Calculate rebalancing requirements
      const rebalanceInstructions = this.calculateRebalancing(
        currentPortfolio,
        optimizedAllocation
      );

      const result: PortfolioAllocation = {
        userId,
        allocations: rebalanceInstructions,
        totalValue: currentPortfolio.totalValue,
        expectedReturn: optimizedAllocation.expectedReturn,
        expectedRisk: optimizedAllocation.expectedRisk,
        diversificationScore: this.calculateDiversificationScore(optimizedAllocation),
      };

      this.logger.log(`Optimized portfolio allocation for user ${userId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to optimize portfolio allocation:', error);
      throw error;
    }
  }

  /**
   * Predict yield performance using ML models
   */
  async predictYieldPerformance(
    strategyId: string,
    timeHorizon: '1d' | '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    expectedApy: number;
    confidence: number;
    riskMetrics: {
      volatility: number;
      maxDrawdown: number;
      valueAtRisk: number;
    };
    scenarios: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
    };
  }> {
    try {
      const strategy = await this.getStrategyDetails(strategyId);
      const featureVector = await this.buildFeatureVector(strategy);
      const marketConditions = await this.getCurrentMarketConditions();

      // ML prediction
      const prediction = await this.mlModel.predictPerformance({
        strategy: featureVector,
        marketConditions,
        timeHorizon,
      });

      // Monte Carlo simulation for risk assessment
      const riskMetrics = await this.calculateRiskMetrics(strategyId, timeHorizon);
      
      // Scenario analysis
      const scenarios = await this.generateScenarios(strategyId, timeHorizon);

      return {
        expectedApy: prediction.expectedReturn,
        confidence: prediction.confidence,
        riskMetrics,
        scenarios,
      };
    } catch (error) {
      this.logger.error('Failed to predict yield performance:', error);
      throw error;
    }
  }

  /**
   * Automated yield strategy optimization with ML
   */
  @Cron(CronExpression.EVERY_HOUR)
  async automatedYieldOptimization(): Promise<void> {
    try {
      this.logger.log('Starting automated yield optimization');

      // Get all active users with auto-optimization enabled
      const users = await this.getAutoOptimizationUsers();

      for (const user of users) {
        try {
          // Check if optimization is needed
          const needsOptimization = await this.checkOptimizationNeed(user.id);
          
          if (needsOptimization) {
            // Generate new optimization
            const optimization = await this.optimizePortfolioAllocation(user.id);
            
            // Check if changes are significant enough
            if (this.isSignificantRebalance(optimization)) {
              // Create optimization proposal
              await this.createOptimizationProposal(user.id, optimization);
              
              // Send notification to user
              await this.notifyOptimizationAvailable(user.id, optimization);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to optimize for user ${user.id}:`, error);
        }
      }

      this.logger.log('Completed automated yield optimization');
    } catch (error) {
      this.logger.error('Failed automated yield optimization:', error);
    }
  }

  /**
   * Build feature vector for ML model
   */
  private async buildFeatureVector(strategy: any): Promise<MLFeatureVector> {
    const historicalData = await this.getStrategyHistoricalData(strategy.id);
    const correlations = await this.calculateCorrelations(strategy.id);
    const marketData = await this.getCurrentMarketConditions();

    return {
      historicalApy: historicalData.apy,
      volatility: this.calculateVolatility(historicalData.returns),
      sharpeRatio: this.calculateSharpeRatio(historicalData.returns),
      maxDrawdown: this.calculateMaxDrawdown(historicalData.values),
      liquidityScore: strategy.liquidityScore || 0.5,
      protocolTrustScore: strategy.protocolTrustScore || 0.7,
      timeInMarket: strategy.timeInMarket || 0,
      correlationMatrix: correlations,
      marketConditions: marketData,
      riskScore: strategy.riskScore || 0.5,
    };
  }

  /**
   * Apply risk constraints to ML recommendations
   */
  private applyRiskConstraints(
    recommendations: any[],
    riskTolerance: string,
    currentPortfolio: any
  ): OptimizationResult[] {
    const riskLimits = {
      conservative: { maxRisk: 0.15, maxAllocation: 0.30 },
      moderate: { maxRisk: 0.25, maxAllocation: 0.50 },
      aggressive: { maxRisk: 0.40, maxAllocation: 0.70 },
    };

    const limits = riskLimits[riskTolerance];

    return recommendations
      .filter(rec => rec.expectedRisk <= limits.maxRisk)
      .map(rec => ({
        ...rec,
        recommendedAllocation: Math.min(rec.recommendedAllocation, limits.maxAllocation),
      }))
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 10); // Top 10 recommendations
  }

  /**
   * Modern Portfolio Theory optimization with ML enhancements
   */
  private async modernPortfolioOptimization(params: {
    currentPortfolio: any;
    recommendations: OptimizationResult[];
    targetReturn?: number;
    maxRisk?: number;
    userConstraints: any;
  }): Promise<any> {
    // Implement efficient frontier calculation
    // This would use optimization libraries like scipy.optimize equivalent in TypeScript
    // For now, we'll use a simplified heuristic approach

    const { recommendations, targetReturn, maxRisk } = params;
    
    // Calculate efficient frontier points
    const efficientFrontier = await this.calculateEfficientFrontier(recommendations);
    
    // Select optimal point based on constraints
    let optimalPoint = efficientFrontier[0];
    
    if (targetReturn) {
      optimalPoint = efficientFrontier.find(point => 
        Math.abs(point.expectedReturn - targetReturn) < 0.01
      ) || optimalPoint;
    }
    
    if (maxRisk) {
      optimalPoint = efficientFrontier.find(point => 
        point.expectedRisk <= maxRisk
      ) || optimalPoint;
    }

    return optimalPoint;
  }

  /**
   * Calculate various risk metrics
   */
  private async calculateRiskMetrics(strategyId: string, timeHorizon: string) {
    const historicalData = await this.getStrategyHistoricalData(strategyId);
    
    return {
      volatility: this.calculateVolatility(historicalData.returns),
      maxDrawdown: this.calculateMaxDrawdown(historicalData.values),
      valueAtRisk: this.calculateVaR(historicalData.returns, 0.05), // 95% VaR
    };
  }

  /**
   * Statistical calculation helpers
   */
  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 365); // Annualized volatility
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    return (meanReturn - riskFreeRate) / volatility;
  }

  private calculateMaxDrawdown(values: number[]): number {
    let maxDrawdown = 0;
    let peak = values[0];
    
    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return sortedReturns[index];
  }

  /**
   * Helper methods for data retrieval
   */
  private async loadHistoricalYieldData(): Promise<any> {
    // Load comprehensive historical data for ML training
    return await this.prisma.yieldPerformanceHistory.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        },
      },
      include: {
        strategy: true,
      },
    });
  }

  private async getUserPortfolio(userId: string): Promise<any> {
    return await this.prisma.userPortfolio.findUnique({
      where: { userId },
      include: {
        positions: {
          include: {
            strategy: true,
          },
        },
      },
    });
  }

  private async getAvailableStrategies(): Promise<any[]> {
    return await this.prisma.yieldStrategy.findMany({
      where: { isActive: true },
      include: {
        performanceHistory: {
          orderBy: { createdAt: 'desc' },
          take: 100, // Last 100 data points
        },
      },
    });
  }

  private async getCurrentMarketConditions(): Promise<MarketCondition> {
    // This would integrate with external market data APIs
    return {
      volatilityRegime: 'medium',
      trendDirection: 'bullish',
      liquidityIndex: 0.75,
      fearGreedIndex: 65,
      defiTvlTrend: 0.85,
    };
  }

  private async getUserRiskProfile(userId: string): Promise<any> {
    return await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        riskPreferences: true,
      },
    });
  }

  private calculateDiversificationScore(allocation: any): number {
    // Calculate Herfindahl-Hirschman Index for diversification
    const weights = allocation.allocations.map(a => a.recommendedAllocation);
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    return 1 - hhi; // Higher score = more diversified
  }

  private calculateRebalancing(currentPortfolio: any, optimizedAllocation: any): any[] {
    // Calculate rebalancing requirements
    return optimizedAllocation.allocations.map(allocation => ({
      strategyId: allocation.strategyId,
      currentAllocation: currentPortfolio.getCurrentAllocation(allocation.strategyId),
      recommendedAllocation: allocation.recommendedAllocation,
      rebalanceAmount: allocation.recommendedAllocation - currentPortfolio.getCurrentAllocation(allocation.strategyId),
    }));
  }

  private async calculateEfficientFrontier(recommendations: OptimizationResult[]): Promise<any[]> {
    // Simplified efficient frontier calculation
    // In production, this would use proper optimization algorithms
    
    const frontierPoints = [];
    for (let risk = 0.05; risk <= 0.40; risk += 0.01) {
      const optimalAllocation = this.optimizeForRisk(recommendations, risk);
      frontierPoints.push(optimalAllocation);
    }
    
    return frontierPoints;
  }

  private optimizeForRisk(recommendations: OptimizationResult[], targetRisk: number): any {
    // Simplified risk optimization
    const validRecommendations = recommendations.filter(r => r.expectedRisk <= targetRisk);
    const totalWeight = validRecommendations.reduce((sum, r) => sum + r.confidenceScore, 0);
    
    return {
      allocations: validRecommendations.map(r => ({
        strategyId: r.strategyId,
        recommendedAllocation: r.confidenceScore / totalWeight,
      })),
      expectedReturn: validRecommendations.reduce((sum, r) => sum + r.expectedReturn * r.confidenceScore / totalWeight, 0),
      expectedRisk: targetRisk,
    };
  }

  private async getAutoOptimizationUsers(): Promise<any[]> {
    return await this.prisma.user.findMany({
      where: {
        profile: {
          autoOptimizationEnabled: true,
        },
      },
    });
  }

  private async checkOptimizationNeed(userId: string): Promise<boolean> {
    const lastOptimization = await this.prisma.optimizationHistory.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastOptimization) return true;

    const hoursSinceLastOptimization = 
      (Date.now() - lastOptimization.createdAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastOptimization >= 24; // Optimize daily
  }

  private isSignificantRebalance(optimization: PortfolioAllocation): boolean {
    return optimization.allocations.some(a => Math.abs(a.rebalanceAmount) > 0.05); // 5% threshold
  }

  private async createOptimizationProposal(userId: string, optimization: PortfolioAllocation): Promise<void> {
    await this.prisma.optimizationProposal.create({
      data: {
        userId,
        proposedAllocations: optimization.allocations,
        expectedReturn: optimization.expectedReturn,
        expectedRisk: optimization.expectedRisk,
        diversificationScore: optimization.diversificationScore,
        status: 'pending',
      },
    });
  }

  private async notifyOptimizationAvailable(userId: string, optimization: PortfolioAllocation): Promise<void> {
    // This would integrate with notification service
    this.logger.log(`Optimization notification sent to user ${userId}`);
  }

  private async getStrategyDetails(strategyId: string): Promise<any> {
    return await this.prisma.yieldStrategy.findUnique({
      where: { id: strategyId },
      include: {
        performanceHistory: true,
      },
    });
  }

  private async getStrategyHistoricalData(strategyId: string): Promise<any> {
    const data = await this.prisma.yieldPerformanceHistory.findMany({
      where: { strategyId },
      orderBy: { createdAt: 'desc' },
      take: 365, // Last year of data
    });

    return {
      apy: data.map(d => d.apy),
      returns: data.map(d => d.dailyReturn),
      values: data.map(d => d.totalValue),
    };
  }

  private async calculateCorrelations(strategyId: string): Promise<number[][]> {
    // Calculate correlation matrix with other strategies
    // Simplified implementation
    const strategies = await this.getAvailableStrategies();
    const correlationMatrix = Array(strategies.length).fill(null).map(() => Array(strategies.length).fill(0));
    
    // Diagonal is 1 (perfect correlation with itself)
    for (let i = 0; i < strategies.length; i++) {
      correlationMatrix[i][i] = 1;
    }
    
    return correlationMatrix;
  }

  private async generateScenarios(strategyId: string, timeHorizon: string): Promise<any> {
    const historicalData = await this.getStrategyHistoricalData(strategyId);
    const meanReturn = historicalData.returns.reduce((sum, r) => sum + r, 0) / historicalData.returns.length;
    const volatility = this.calculateVolatility(historicalData.returns);

    return {
      optimistic: meanReturn + 1.5 * volatility, // +1.5 sigma
      realistic: meanReturn,
      pessimistic: meanReturn - 1.5 * volatility, // -1.5 sigma
    };
  }
}

/**
 * Simplified ML Model class
 * In production, this would integrate with proper ML libraries
 */
class YieldOptimizationModel {
  private trainingData: any[] = [];
  private modelWeights: any = {};

  async initialize(historicalData: any[]): Promise<void> {
    this.trainingData = historicalData;
    await this.trainModel();
  }

  async predict(input: any): Promise<any[]> {
    // Simplified prediction logic
    // In production, this would use trained ML models
    
    const { featureVectors, marketConditions, riskTolerance, timeHorizon } = input;
    
    return featureVectors.map((features, index) => ({
      strategyId: `strategy-${index}`,
      recommendedAllocation: this.calculateAllocation(features, marketConditions, riskTolerance),
      confidenceScore: this.calculateConfidence(features, marketConditions),
      expectedReturn: features.historicalApy[0] || 0.05,
      expectedRisk: features.volatility || 0.15,
      reasoning: this.generateReasoning(features, marketConditions),
      timeHorizon,
    }));
  }

  async predictPerformance(input: any): Promise<any> {
    const { strategy, marketConditions, timeHorizon } = input;
    
    return {
      expectedReturn: strategy.historicalApy[0] || 0.05,
      confidence: this.calculateConfidence(strategy, marketConditions),
    };
  }

  private async trainModel(): Promise<void> {
    // Simplified training logic
    // In production, this would implement proper ML training
    this.modelWeights = {
      apyWeight: 0.3,
      riskWeight: 0.25,
      liquidityWeight: 0.2,
      diversificationWeight: 0.15,
      marketWeight: 0.1,
    };
  }

  private calculateAllocation(features: MLFeatureVector, marketConditions: MarketCondition, riskTolerance: string): number {
    const riskMultiplier = {
      conservative: 0.5,
      moderate: 0.75,
      aggressive: 1.0,
    }[riskTolerance] || 0.75;

    const baseAllocation = Math.min(0.5, features.sharpeRatio * 0.1) * riskMultiplier;
    const marketAdjustment = marketConditions.liquidityIndex * 0.1;
    
    return Math.max(0.01, Math.min(0.7, baseAllocation + marketAdjustment));
  }

  private calculateConfidence(features: MLFeatureVector, marketConditions: MarketCondition): number {
    const historyScore = Math.min(1.0, features.timeInMarket / 365); // Prefer strategies with longer history
    const liquidityScore = features.liquidityScore;
    const trustScore = features.protocolTrustScore;
    const marketScore = marketConditions.liquidityIndex;

    return (historyScore + liquidityScore + trustScore + marketScore) / 4;
  }

  private generateReasoning(features: MLFeatureVector, marketConditions: MarketCondition): string[] {
    const reasons = [];
    
    if (features.sharpeRatio > 1.0) {
      reasons.push('High risk-adjusted returns based on historical performance');
    }
    
    if (features.liquidityScore > 0.8) {
      reasons.push('High liquidity score ensures easy entry and exit');
    }
    
    if (features.protocolTrustScore > 0.8) {
      reasons.push('High protocol trust score indicates low smart contract risk');
    }
    
    if (marketConditions.liquidityIndex > 0.7) {
      reasons.push('Favorable market liquidity conditions');
    }

    return reasons;
  }
}