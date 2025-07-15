import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  merchantName?: string;
  yieldAmount?: number;
  description?: string;
}

interface YieldStrategy {
  id: string;
  name: string;
  description: string;
  apy: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  minAmount: number;
  tvl?: number;
}

interface BridgeTransaction {
  id: string;
  sourceChain: string;
  destinationChain: string;
  amount: number;
  status: string;
  createdAt: string;
  fee?: number;
}

interface AppState {
  // Dashboard
  totalBalance: number;
  totalYield: number;
  pendingPayments: number;
  
  // Payments
  payments: Payment[];
  isLoadingPayments: boolean;
  fetchPayments: () => Promise<void>;
  createPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<void>;
  
  // Yield
  yieldStrategies: YieldStrategy[];
  isLoadingStrategies: boolean;
  fetchYieldStrategies: () => Promise<void>;
  
  // Bridge
  bridgeTransactions: BridgeTransaction[];
  isLoadingBridgeTransactions: boolean;
  fetchBridgeTransactions: () => Promise<void>;
  initiateBridge: (sourceChain: string, destinationChain: string, amount: number) => Promise<BridgeTransaction>;
  
  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Dashboard
      totalBalance: 10250,
      totalYield: 425.5,
      pendingPayments: 3,
      
      // Payments
      payments: [],
      isLoadingPayments: false,
      fetchPayments: async () => {
        set({ isLoadingPayments: true });
        try {
          // In a real app, fetch from API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const mockPayments: Payment[] = [
            {
              id: 'TX-12345',
              amount: 500,
              status: 'COMPLETED',
              createdAt: '2023-07-15T12:00:00Z',
              merchantName: 'Acme Inc',
              yieldAmount: 12.5,
              description: 'Product purchase'
            },
            {
              id: 'TX-12344',
              amount: 750,
              status: 'PENDING',
              createdAt: '2023-07-14T10:30:00Z',
              merchantName: 'Tech Solutions',
              yieldAmount: 8.25,
              description: 'Service payment'
            },
            {
              id: 'TX-12343',
              amount: 1000,
              status: 'COMPLETED',
              createdAt: '2023-07-12T15:45:00Z',
              merchantName: 'Global Services',
              yieldAmount: 25,
              description: 'Consulting fee'
            }
          ];
          
          set({ payments: mockPayments });
        } catch (error) {
          console.error('Error fetching payments:', error);
        } finally {
          set({ isLoadingPayments: false });
        }
      },
      
      createPayment: async (paymentData) => {
        try {
          // In a real app, make API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newPayment: Payment = {
            ...paymentData,
            id: `TX-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
          
          set(state => ({
            payments: [newPayment, ...state.payments],
            pendingPayments: state.pendingPayments + 1
          }));
        } catch (error) {
          console.error('Error creating payment:', error);
          throw error;
        }
      },
      
      // Yield
      yieldStrategies: [],
      isLoadingStrategies: false,
      fetchYieldStrategies: async () => {
        set({ isLoadingStrategies: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const mockStrategies: YieldStrategy[] = [
            {
              id: 'strategy-1',
              name: 'Conservative',
              description: 'Low risk, stable returns with T-bills',
              apy: 3.5,
              riskLevel: 'LOW',
              minAmount: 100,
              tvl: 1250000
            },
            {
              id: 'strategy-2',
              name: 'Balanced',
              description: 'Medium risk, higher returns with DeFi',
              apy: 5.2,
              riskLevel: 'MEDIUM',
              minAmount: 500,
              tvl: 850000
            },
            {
              id: 'strategy-3',
              name: 'Aggressive',
              description: 'Higher risk, maximum returns with yield farming',
              apy: 8.1,
              riskLevel: 'HIGH',
              minAmount: 1000,
              tvl: 450000
            }
          ];
          
          set({ yieldStrategies: mockStrategies });
        } catch (error) {
          console.error('Error fetching yield strategies:', error);
        } finally {
          set({ isLoadingStrategies: false });
        }
      },
      
      // Bridge
      bridgeTransactions: [],
      isLoadingBridgeTransactions: false,
      fetchBridgeTransactions: async () => {
        set({ isLoadingBridgeTransactions: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const mockTransactions: BridgeTransaction[] = [
            {
              id: 'bridge-tx-1',
              sourceChain: 'Ethereum',
              destinationChain: 'Polygon',
              amount: 1000,
              status: 'COMPLETED',
              createdAt: '2023-07-10T09:15:00Z',
              fee: 25
            },
            {
              id: 'bridge-tx-2',
              sourceChain: 'Polygon',
              destinationChain: 'Arbitrum',
              amount: 500,
              status: 'PENDING',
              createdAt: '2023-07-14T14:20:00Z',
              fee: 12
            }
          ];
          
          set({ bridgeTransactions: mockTransactions });
        } catch (error) {
          console.error('Error fetching bridge transactions:', error);
        } finally {
          set({ isLoadingBridgeTransactions: false });
        }
      },
      
      initiateBridge: async (sourceChain: string, destinationChain: string, amount: number) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newTransaction: BridgeTransaction = {
            id: `bridge-tx-${Date.now()}`,
            sourceChain,
            destinationChain,
            amount,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            fee: Math.round(amount * 0.025) // 2.5% fee
          };
          
          set(state => ({
            bridgeTransactions: [newTransaction, ...state.bridgeTransactions]
          }));
          
          return newTransaction;
        } catch (error) {
          console.error('Error initiating bridge transaction:', error);
          throw error;
        }
      },
      
      // UI State
      sidebarOpen: false,
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      theme: 'system',
      setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),
    }),
    {
      name: 'yieldrails-store',
    }
  )
);