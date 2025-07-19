export interface Payment {
  id: string;
  amount: string;
  currency: string;
  recipient: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  type: 'standard' | 'yield_optimized' | 'cross_chain';
  createdAt: string;
  updatedAt: string;
  transactionHash?: string;
  gasPrice?: string;
  gasFee?: string;
  estimatedYield?: string;
  actualYield?: string;
  sourceChain?: string;
  targetChain?: string;
  bridgeFee?: string;
}

export interface PaymentRequest {
  amount: string;
  currency: string;
  recipient: string;
  type: 'standard' | 'yield_optimized' | 'cross_chain';
  memo?: string;
  sourceChain?: string;
  targetChain?: string;
  yieldStrategy?: string;
}

export interface PaymentFilter {
  status?: Payment['status'];
  type?: Payment['type'];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
}

export interface PaymentStats {
  totalPayments: number;
  totalVolume: string;
  avgPaymentAmount: string;
  successRate: number;
  totalYieldEarned: string;
}