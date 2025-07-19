import { Payment, PaymentRequest, PaymentFilter, PaymentStats } from '@types/payment';
import { ApiService } from './ApiService';

export class PaymentService {
  private static instance: PaymentService;
  private apiService: ApiService;

  private constructor() {
    this.apiService = ApiService.getInstance();
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async createPayment(paymentRequest: PaymentRequest): Promise<Payment> {
    try {
      const response = await this.apiService.post('/payments', paymentRequest);
      return response.data;
    } catch (error) {
      console.error('Failed to create payment:', error);
      throw new Error('Failed to create payment');
    }
  }

  async getPayments(filter?: PaymentFilter): Promise<Payment[]> {
    try {
      const params = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await this.apiService.get(`/payments?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      throw new Error('Failed to fetch payments');
    }
  }

  async getPayment(id: string): Promise<Payment> {
    try {
      const response = await this.apiService.get(`/payments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      throw new Error('Failed to fetch payment');
    }
  }

  async cancelPayment(id: string): Promise<Payment> {
    try {
      const response = await this.apiService.post(`/payments/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      throw new Error('Failed to cancel payment');
    }
  }

  async getPaymentStats(): Promise<PaymentStats> {
    try {
      const response = await this.apiService.get('/payments/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment stats:', error);
      throw new Error('Failed to fetch payment stats');
    }
  }

  async estimatePaymentFees(paymentRequest: Omit<PaymentRequest, 'memo'>): Promise<{
    gasFee: string;
    bridgeFee?: string;
    estimatedYield?: string;
  }> {
    try {
      const response = await this.apiService.post('/payments/estimate', paymentRequest);
      return response.data;
    } catch (error) {
      console.error('Failed to estimate payment fees:', error);
      throw new Error('Failed to estimate payment fees');
    }
  }
}