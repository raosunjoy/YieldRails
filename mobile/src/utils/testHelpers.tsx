import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '@store/walletSlice';
import authReducer from '@store/authSlice';
import notificationReducer from '@store/notificationSlice';

// Test store configuration
export const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      wallet: walletReducer,
      auth: authReducer,
      notifications: notificationReducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  store?: ReturnType<typeof createTestStore>;
  navigation?: boolean;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialState = {},
    store = createTestStore(initialState),
    navigation = true,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    let content = (
      <PaperProvider>
        <ReduxProvider store={store}>
          {children}
        </ReduxProvider>
      </PaperProvider>
    );

    if (navigation) {
      content = (
        <NavigationContainer>
          {content}
        </NavigationContainer>
      );
    }

    return content;
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Mock navigation helpers
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(() => 'test-screen'),
  getState: jest.fn(() => ({})),
  getParent: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  reset: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
});

export const createMockRoute = (params = {}) => ({
  key: 'test-route',
  name: 'TestScreen',
  params,
  path: undefined,
});

// Mock API responses
export const mockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  message: 'Success',
});

export const mockApiError = (message: string, status = 400) => ({
  message,
  status,
  code: 'TEST_ERROR',
});

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  walletAddress: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
  kycStatus: 'verified' as const,
  profileComplete: true,
  twoFactorEnabled: false,
  createdAt: '2023-01-01T00:00:00.000Z',
  lastLogin: '2023-01-01T00:00:00.000Z',
};

// Mock wallet data
export const mockConnectedWallet = {
  address: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
  chainId: 1,
  balance: '1.5',
  connector: 'MetaMask',
  isConnected: true,
};

export const mockWalletInfo = {
  id: 'metamask',
  name: 'MetaMask',
  icon: 'https://docs.walletconnect.com/assets/metamask.png',
  deepLink: 'metamask://wc',
  universalLink: 'https://metamask.app.link/wc',
  isInstalled: true,
  rdns: 'io.metamask',
};

// Mock payment data
export const mockPayment = {
  id: 'payment-123',
  amount: '100.00',
  currency: 'USDC',
  recipient: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
  status: 'completed' as const,
  type: 'standard' as const,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  transactionHash: '0xtxhash123',
  gasPrice: '20000000000',
  gasFee: '0.001',
};

// Mock yield strategy data
export const mockYieldStrategy = {
  id: 'strategy-123',
  name: 'Test Strategy',
  protocol: 'Test Protocol',
  description: 'A test yield strategy',
  apy: '8.5',
  tvl: '1000000',
  riskLevel: 'medium' as const,
  supportedTokens: ['USDC', 'USDT', 'DAI'],
  minimumDeposit: '100',
  fees: {
    management: '0.5',
    performance: '10',
  },
  isActive: true,
};

// Mock notification data
export const mockNotification = {
  id: 'notification-123',
  title: 'Payment Completed',
  body: 'Your payment of 100 USDC has been completed',
  data: { paymentId: 'payment-123' },
  timestamp: Date.now(),
  type: 'payment_sent' as const,
  priority: 'default' as const,
  read: false,
  actionable: false,
};

// Test data generators
export const generateMockPayments = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockPayment,
    id: `payment-${index + 1}`,
    amount: (Math.random() * 1000).toFixed(2),
    status: ['pending', 'processing', 'completed', 'failed'][Math.floor(Math.random() * 4)] as any,
  }));
};

export const generateMockNotifications = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockNotification,
    id: `notification-${index + 1}`,
    timestamp: Date.now() - (index * 60000),
    read: Math.random() > 0.5,
  }));
};

// Async helpers
export const waitForNextUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Custom matchers
export const expectElementToBeVisible = (element: any) => {
  expect(element).toBeTruthy();
};

export const expectElementToHaveText = (element: any, text: string) => {
  expect(element).toHaveTextContent(text);
};

// Service mocks
export const createMockPaymentService = () => ({
  createPayment: jest.fn(() => Promise.resolve(mockPayment)),
  getPayments: jest.fn(() => Promise.resolve([mockPayment])),
  getPayment: jest.fn(() => Promise.resolve(mockPayment)),
  cancelPayment: jest.fn(() => Promise.resolve(mockPayment)),
  getPaymentStats: jest.fn(() => Promise.resolve({
    totalPayments: 10,
    totalVolume: '1000.00',
    avgPaymentAmount: '100.00',
    successRate: 95,
    totalYieldEarned: '50.00',
  })),
  estimatePaymentFees: jest.fn(() => Promise.resolve({
    gasFee: '0.001',
    bridgeFee: '0.1',
    estimatedYield: '5.0',
  })),
});

export const createMockYieldService = () => ({
  getStrategies: jest.fn(() => Promise.resolve([mockYieldStrategy])),
  getStrategy: jest.fn(() => Promise.resolve(mockYieldStrategy)),
  getPortfolio: jest.fn(() => Promise.resolve({
    totalValue: '1000.00',
    totalEarned: '50.00',
    averageApy: '8.5',
    positions: [],
    performance: [],
  })),
  getPositions: jest.fn(() => Promise.resolve([])),
  createPosition: jest.fn(() => Promise.resolve({})),
  withdrawPosition: jest.fn(() => Promise.resolve({})),
  simulateYield: jest.fn(() => Promise.resolve({
    strategyId: 'strategy-123',
    amount: '100',
    currency: 'USDC',
    projectedDaily: '0.02',
    projectedMonthly: '0.6',
    projectedYearly: '7.2',
    estimatedApy: '7.2',
  })),
});

export const createMockWalletService = () => ({
  initialize: jest.fn(() => Promise.resolve()),
  connectWallet: jest.fn(() => Promise.resolve(mockConnectedWallet)),
  disconnectWallet: jest.fn(() => Promise.resolve()),
  getBalance: jest.fn(() => Promise.resolve('1.5')),
  getTokenBalances: jest.fn(() => Promise.resolve([])),
  sendTransaction: jest.fn(() => Promise.resolve('0xtxhash')),
  signTransaction: jest.fn(() => Promise.resolve('0xsignedtx')),
  personalSign: jest.fn(() => Promise.resolve('0xsignature')),
  signTypedData: jest.fn(() => Promise.resolve('0xsignature')),
  switchChain: jest.fn(() => Promise.resolve()),
  restoreSession: jest.fn(() => Promise.resolve(mockConnectedWallet)),
  getConnectedWallet: jest.fn(() => mockConnectedWallet),
  getAvailableWallets: jest.fn(() => [mockWalletInfo]),
});

// Re-export testing library utilities
export * from '@testing-library/react-native';
export { act, fireEvent, waitFor } from '@testing-library/react-native';