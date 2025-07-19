export interface YieldStrategy {
  id: string;
  name: string;
  protocol: string;
  description: string;
  apy: string;
  tvl: string;
  riskLevel: 'low' | 'medium' | 'high';
  supportedTokens: string[];
  minimumDeposit: string;
  lockupPeriod?: string;
  fees: {
    management: string;
    performance: string;
  };
  isActive: boolean;
}

export interface YieldPosition {
  id: string;
  strategyId: string;
  strategy: YieldStrategy;
  amount: string;
  currency: string;
  earnedYield: string;
  currentApy: string;
  createdAt: string;
  lastUpdateAt: string;
  status: 'active' | 'withdrawing' | 'withdrawn';
}

export interface YieldPerformance {
  period: '24h' | '7d' | '30d' | '90d' | '1y';
  totalEarned: string;
  averageApy: string;
  bestPerforming: {
    strategyId: string;
    strategyName: string;
    yield: string;
  };
  worstPerforming: {
    strategyId: string;
    strategyName: string;
    yield: string;
  };
}

export interface YieldPortfolio {
  totalValue: string;
  totalEarned: string;
  averageApy: string;
  positions: YieldPosition[];
  performance: YieldPerformance[];
}

export interface YieldSimulation {
  strategyId: string;
  amount: string;
  currency: string;
  projectedDaily: string;
  projectedMonthly: string;
  projectedYearly: string;
  estimatedApy: string;
}