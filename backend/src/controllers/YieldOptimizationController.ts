import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { YieldOptimizationMLService } from '../services/ml/YieldOptimizationML';
import { RiskAssessmentService } from '../services/ml/RiskAssessmentService';
import { PredictiveAnalyticsService } from '../services/ml/PredictiveAnalyticsService';

// DTOs for API requests and responses
export class OptimizationRequestDto {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon?: '1d' | '7d' | '30d' | '90d';
  targetReturn?: number;
  maxRisk?: number;
  constraints?: any[];
}

export class RebalanceRequestDto {
  portfolioId: string;
  autoExecute?: boolean;
  urgencyOverride?: 'low' | 'medium' | 'high' | 'critical';
}

export class ForecastRequestDto {
  strategyId: string;
  timeHorizon: '1d' | '7d' | '30d' | '90d' | '1y';
}

export class StressTestRequestDto {
  portfolioId: string;
  scenarios?: string[];
  customScenario?: {
    name: string;
    description: string;
    parameters: any;
  };
}

export class AutoOptimizationSettingsDto {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  rebalanceThreshold: number;
  maxPositionSize: number;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

@ApiTags('Yield Optimization')
@Controller('api/yield-optimization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class YieldOptimizationController {
  constructor(
    private readonly mlService: YieldOptimizationMLService,
    private readonly riskService: RiskAssessmentService,
    private readonly analyticsService: PredictiveAnalyticsService,
  ) {}

  @Get('recommendations')
  @ApiOperation({ summary: 'Get ML-powered yield optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations retrieved successfully' })
  async getOptimizationRecommendations(
    @GetUser() user: any,
    @Query('riskTolerance') riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    @Query('timeHorizon') timeHorizon: '1d' | '7d' | '30d' | '90d' = '30d'
  ) {
    try {
      const recommendations = await this.mlService.generateOptimizationRecommendations(
        user.id,
        riskTolerance,
        timeHorizon
      );

      return {
        status: 'success',
        data: {
          recommendations,
          generatedAt: new Date(),
          modelVersion: '1.0.0',
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to generate optimization recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('optimize-portfolio')
  @ApiOperation({ summary: 'Optimize portfolio allocation using ML algorithms' })
  @ApiResponse({ status: 200, description: 'Portfolio optimization completed successfully' })
  async optimizePortfolio(
    @GetUser() user: any,
    @Body() request: OptimizationRequestDto
  ) {
    try {
      const optimization = await this.mlService.optimizePortfolioAllocation(
        user.id,
        request.targetReturn,
        request.maxRisk
      );

      return {
        status: 'success',
        data: {
          optimization,
          recommendations: {
            implement: optimization.expectedReturn > 0.05,
            confidence: optimization.diversificationScore,
            reasoning: [
              'Optimized allocation based on risk-return profile',
              'Improved diversification score',
              'Aligned with user risk tolerance',
            ],
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to optimize portfolio',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('portfolio/:portfolioId/risk-assessment')
  @ApiOperation({ summary: 'Get comprehensive portfolio risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk assessment completed successfully' })
  async assessPortfolioRisk(
    @GetUser() user: any,
    @Param('portfolioId') portfolioId: string
  ) {
    try {
      const riskMetrics = await this.riskService.assessPortfolioRisk(portfolioId);

      return {
        status: 'success',
        data: {
          riskMetrics,
          riskLevel: this.getRiskLevel(riskMetrics.riskScore),
          recommendations: this.generateRiskRecommendations(riskMetrics),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to assess portfolio risk',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('portfolio/:portfolioId/rebalance')
  @ApiOperation({ summary: 'Generate portfolio rebalancing recommendations' })
  @ApiResponse({ status: 200, description: 'Rebalancing recommendations generated successfully' })
  async generateRebalanceRecommendations(
    @GetUser() user: any,
    @Param('portfolioId') portfolioId: string,
    @Body() request: RebalanceRequestDto
  ) {
    try {
      const recommendations = await this.riskService.generateRebalanceRecommendations(portfolioId);

      if (!recommendations) {
        return {
          status: 'success',
          data: {
            message: 'No rebalancing needed at this time',
            nextCheckDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        };
      }

      return {
        status: 'success',
        data: {
          recommendations,
          executionPlan: this.createExecutionPlan(recommendations),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to generate rebalancing recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('portfolio/:portfolioId/stress-test')
  @ApiOperation({ summary: 'Perform portfolio stress testing' })
  @ApiResponse({ status: 200, description: 'Stress testing completed successfully' })
  async performStressTesting(
    @GetUser() user: any,
    @Param('portfolioId') portfolioId: string,
    @Body() request: StressTestRequestDto
  ) {
    try {
      const stressResults = await this.riskService.performStressTesting(portfolioId);

      return {
        status: 'success',
        data: {
          stressResults,
          summary: this.summarizeStressResults(stressResults),
          recommendations: this.generateStressTestRecommendations(stressResults),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to perform stress testing',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('strategies/:strategyId/forecast')
  @ApiOperation({ summary: 'Get yield forecast for specific strategy' })
  @ApiResponse({ status: 200, description: 'Yield forecast generated successfully' })
  async getYieldForecast(
    @GetUser() user: any,
    @Param('strategyId') strategyId: string,
    @Query('timeHorizon') timeHorizon: '1d' | '7d' | '30d' | '90d' | '1y' = '30d'
  ) {
    try {
      const forecast = await this.analyticsService.generateYieldForecast(strategyId, timeHorizon);

      return {
        status: 'success',
        data: {
          forecast,
          investmentGuidance: this.generateInvestmentGuidance(forecast),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to generate yield forecast',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('strategies/:strategyId/performance-prediction')
  @ApiOperation({ summary: 'Get performance prediction for strategy' })
  @ApiResponse({ status: 200, description: 'Performance prediction generated successfully' })
  async predictYieldPerformance(
    @GetUser() user: any,
    @Param('strategyId') strategyId: string,
    @Query('timeHorizon') timeHorizon: '1d' | '7d' | '30d' | '90d' = '30d'
  ) {
    try {
      const prediction = await this.mlService.predictYieldPerformance(strategyId, timeHorizon);

      return {
        status: 'success',
        data: {
          prediction,
          confidence: prediction.confidence,
          riskWarnings: this.generateRiskWarnings(prediction),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to predict yield performance',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('market-trends')
  @ApiOperation({ summary: 'Get market trend analysis' })
  @ApiResponse({ status: 200, description: 'Market trends analyzed successfully' })
  async getMarketTrends(
    @GetUser() user: any,
    @Query('period') period: '24h' | '7d' | '30d' | '90d' = '30d'
  ) {
    try {
      const trends = await this.analyticsService.analyzeMarketTrends(period);

      return {
        status: 'success',
        data: {
          trends,
          insights: this.generateMarketInsights(trends),
          tradingSignals: this.generateTradingSignals(trends),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to analyze market trends',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('portfolio/:portfolioId/attribution')
  @ApiOperation({ summary: 'Get portfolio performance attribution analysis' })
  @ApiResponse({ status: 200, description: 'Attribution analysis completed successfully' })
  async getPerformanceAttribution(
    @GetUser() user: any,
    @Param('portfolioId') portfolioId: string,
    @Query('period') period: '1d' | '7d' | '30d' | '90d' = '30d'
  ) {
    try {
      const attribution = await this.analyticsService.performAttributionAnalysis(portfolioId, period);

      return {
        status: 'success',
        data: {
          attribution,
          actionableInsights: this.generateAttributionInsights(attribution),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to perform attribution analysis',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Identify current yield opportunities' })
  @ApiResponse({ status: 200, description: 'Yield opportunities identified successfully' })
  async getYieldOpportunities(@GetUser() user: any) {
    try {
      const opportunities = await this.analyticsService.identifyYieldOpportunities();

      return {
        status: 'success',
        data: {
          opportunities: opportunities.slice(0, 10), // Top 10 opportunities
          totalFound: opportunities.length,
          lastUpdated: new Date(),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to identify yield opportunities',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('auto-optimization/settings')
  @ApiOperation({ summary: 'Get auto-optimization settings' })
  @ApiResponse({ status: 200, description: 'Auto-optimization settings retrieved successfully' })
  async getAutoOptimizationSettings(@GetUser() user: any) {
    try {
      // This would fetch from database in production
      const settings = {
        enabled: false,
        frequency: 'weekly',
        riskTolerance: 'moderate',
        rebalanceThreshold: 0.05,
        maxPositionSize: 0.3,
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      };

      return {
        status: 'success',
        data: { settings },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get auto-optimization settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('auto-optimization/settings')
  @ApiOperation({ summary: 'Update auto-optimization settings' })
  @ApiResponse({ status: 200, description: 'Auto-optimization settings updated successfully' })
  async updateAutoOptimizationSettings(
    @GetUser() user: any,
    @Body() settings: AutoOptimizationSettingsDto
  ) {
    try {
      // In production, this would update the database
      return {
        status: 'success',
        data: {
          message: 'Auto-optimization settings updated successfully',
          settings,
          effectiveDate: new Date(),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to update auto-optimization settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get comprehensive yield optimization analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard data retrieved successfully' })
  async getAnalyticsDashboard(
    @GetUser() user: any,
    @Query('timeframe') timeframe: '24h' | '7d' | '30d' | '90d' = '30d'
  ) {
    try {
      // Aggregate data from multiple services
      const [trends, opportunities] = await Promise.all([
        this.analyticsService.analyzeMarketTrends(timeframe),
        this.analyticsService.identifyYieldOpportunities(),
      ]);

      return {
        status: 'success',
        data: {
          overview: {
            totalOpportunities: opportunities.length,
            avgExpectedReturn: opportunities.reduce((sum, opp) => sum + opp.expectedReturn, 0) / opportunities.length,
            marketTrend: trends.predictions.nextPeriodDirection,
            riskLevel: this.calculateMarketRisk(trends),
          },
          trends,
          topOpportunities: opportunities.slice(0, 5),
          insights: this.generateDashboardInsights(trends, opportunities),
          lastUpdated: new Date(),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get analytics dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Helper methods for generating insights and recommendations
  private getRiskLevel(riskScore: number): string {
    if (riskScore < 30) return 'Low';
    if (riskScore < 60) return 'Medium';
    if (riskScore < 80) return 'High';
    return 'Very High';
  }

  private generateRiskRecommendations(riskMetrics: any): string[] {
    const recommendations = [];

    if (riskMetrics.concentrationRisk > 0.6) {
      recommendations.push('Consider diversifying across more strategies to reduce concentration risk');
    }

    if (riskMetrics.liquidityRisk > 0.4) {
      recommendations.push('Increase allocation to more liquid strategies for better exit flexibility');
    }

    if (riskMetrics.volatility > 0.3) {
      recommendations.push('Consider reducing exposure to high-volatility strategies');
    }

    return recommendations;
  }

  private createExecutionPlan(recommendations: any): any {
    return {
      phases: [
        {
          phase: 1,
          description: 'Reduce high-risk positions',
          actions: recommendations.recommendedAllocation
            .filter(a => a.change < -0.05)
            .map(a => ({
              action: 'reduce',
              strategyId: a.strategyId,
              amount: Math.abs(a.change),
            })),
        },
        {
          phase: 2,
          description: 'Increase strategic positions',
          actions: recommendations.recommendedAllocation
            .filter(a => a.change > 0.05)
            .map(a => ({
              action: 'increase',
              strategyId: a.strategyId,
              amount: a.change,
            })),
        },
      ],
      estimatedCost: recommendations.expectedImpact.costEstimate,
      timeToComplete: '2-4 hours',
    };
  }

  private summarizeStressResults(results: any[]): any {
    const worstScenario = results.reduce((worst, current) => 
      current.portfolioImpact < worst.portfolioImpact ? current : worst
    );

    const avgImpact = results.reduce((sum, r) => sum + r.portfolioImpact, 0) / results.length;

    return {
      worstCaseScenario: worstScenario.scenario,
      worstCaseImpact: worstScenario.portfolioImpact,
      averageImpact: avgImpact,
      scenariosTested: results.length,
      riskLevel: avgImpact < -0.1 ? 'Low' : avgImpact < -0.2 ? 'Medium' : 'High',
    };
  }

  private generateStressTestRecommendations(results: any[]): string[] {
    const recommendations = [];
    
    const avgImpact = results.reduce((sum, r) => sum + r.portfolioImpact, 0) / results.length;
    
    if (avgImpact < -0.2) {
      recommendations.push('Consider increasing diversification to reduce stress scenario impact');
    }

    if (results.some(r => r.liquidityImpact > 0.5)) {
      recommendations.push('Improve liquidity buffers to handle crisis scenarios');
    }

    return recommendations;
  }

  private generateInvestmentGuidance(forecast: any): any {
    const confidence = forecast.predictions.confidence;
    const expectedReturn = forecast.predictions.expectedApy;

    return {
      recommendation: expectedReturn > 0.08 && confidence > 0.7 ? 'Strong Buy' :
                    expectedReturn > 0.05 && confidence > 0.6 ? 'Buy' :
                    expectedReturn > 0.03 ? 'Hold' : 'Avoid',
      reasoning: [
        `Expected APY: ${(expectedReturn * 100).toFixed(2)}%`,
        `Confidence: ${(confidence * 100).toFixed(0)}%`,
        `Risk level: ${forecast.riskFactors.length > 3 ? 'High' : 'Medium'}`,
      ],
      suggestedAllocation: Math.min(0.3, confidence * 0.5),
    };
  }

  private generateRiskWarnings(prediction: any): string[] {
    const warnings = [];

    if (prediction.confidence < 0.6) {
      warnings.push('Low confidence in prediction due to limited historical data');
    }

    if (prediction.riskMetrics.maxDrawdown > 0.25) {
      warnings.push('High maximum drawdown risk detected');
    }

    if (prediction.riskMetrics.volatility > 0.4) {
      warnings.push('High volatility may impact returns');
    }

    return warnings;
  }

  private generateMarketInsights(trends: any): string[] {
    const insights = [];

    if (trends.predictions.nextPeriodDirection === 'up') {
      insights.push('Market conditions appear favorable for yield strategies');
    }

    if (trends.correlations.yieldVsMarket > 0.7) {
      insights.push('Yield strategies showing high correlation with broader market');
    }

    return insights;
  }

  private generateTradingSignals(trends: any): any[] {
    const signals = [];

    if (trends.trends.yieldRates.trend === 'increasing' && trends.trends.yieldRates.momentum === 'accelerating') {
      signals.push({
        signal: 'Buy',
        strength: 'Strong',
        reason: 'Yield rates trending up with accelerating momentum',
      });
    }

    return signals;
  }

  private generateAttributionInsights(attribution: any): string[] {
    const insights = [];

    if (attribution.breakdown.strategySelection > 0.02) {
      insights.push('Strategy selection was the primary driver of outperformance');
    }

    if (attribution.breakdown.timing < -0.01) {
      insights.push('Market timing detracted from returns - consider long-term positioning');
    }

    return insights;
  }

  private calculateMarketRisk(trends: any): string {
    const volatilityTrend = trends.trends.volatility.trend;
    const marketDirection = trends.predictions.nextPeriodDirection;

    if (volatilityTrend === 'increasing' && marketDirection === 'down') {
      return 'High';
    }

    if (volatilityTrend === 'decreasing' && marketDirection === 'up') {
      return 'Low';
    }

    return 'Medium';
  }

  private generateDashboardInsights(trends: any, opportunities: any[]): string[] {
    const insights = [];

    insights.push(`${opportunities.length} yield opportunities identified`);
    insights.push(`Market trend: ${trends.predictions.nextPeriodDirection}`);
    
    if (opportunities.length > 10) {
      insights.push('High opportunity environment - consider increasing allocations');
    }

    return insights;
  }
}