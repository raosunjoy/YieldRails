import { YieldStrategy, YieldPosition, YieldPortfolio, YieldSimulation } from '@types/yield';
import { ApiService } from './ApiService';

export class YieldService {
  private static instance: YieldService;
  private apiService: ApiService;

  private constructor() {
    this.apiService = ApiService.getInstance();
  }

  public static getInstance(): YieldService {
    if (!YieldService.instance) {
      YieldService.instance = new YieldService();
    }
    return YieldService.instance;
  }

  async getStrategies(): Promise<YieldStrategy[]> {
    try {
      const response = await this.apiService.get('/yield/strategies');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch yield strategies:', error);
      throw new Error('Failed to fetch yield strategies');
    }
  }

  async getStrategy(id: string): Promise<YieldStrategy> {
    try {
      const response = await this.apiService.get(`/yield/strategies/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch yield strategy:', error);
      throw new Error('Failed to fetch yield strategy');
    }
  }

  async getPortfolio(): Promise<YieldPortfolio> {
    try {
      const response = await this.apiService.get('/yield/portfolio');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch yield portfolio:', error);
      throw new Error('Failed to fetch yield portfolio');
    }
  }

  async getPositions(): Promise<YieldPosition[]> {
    try {
      const response = await this.apiService.get('/yield/positions');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch yield positions:', error);
      throw new Error('Failed to fetch yield positions');
    }
  }

  async createPosition(strategyId: string, amount: string, currency: string): Promise<YieldPosition> {
    try {
      const response = await this.apiService.post('/yield/positions', {
        strategyId,
        amount,
        currency,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create yield position:', error);
      throw new Error('Failed to create yield position');
    }
  }

  async withdrawPosition(positionId: string, amount?: string): Promise<YieldPosition> {
    try {
      const response = await this.apiService.post(`/yield/positions/${positionId}/withdraw`, {
        amount,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to withdraw from position:', error);
      throw new Error('Failed to withdraw from position');
    }
  }

  async simulateYield(strategyId: string, amount: string, currency: string): Promise<YieldSimulation> {
    try {
      const response = await this.apiService.post('/yield/simulate', {
        strategyId,
        amount,
        currency,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to simulate yield:', error);
      throw new Error('Failed to simulate yield');
    }
  }

  async getHistoricalPerformance(strategyId: string, period: string): Promise<any[]> {
    try {
      const response = await this.apiService.get(`/yield/strategies/${strategyId}/performance?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch historical performance:', error);
      throw new Error('Failed to fetch historical performance');
    }
  }
}