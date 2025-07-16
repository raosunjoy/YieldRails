import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from '../PaymentForm';
import { useStore } from '@/store/useStore';

// Mock the store
jest.mock('@/store/useStore');
const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

// Mock data
const mockYieldStrategies = [
  {
    id: 'strategy-1',
    name: 'Conservative',
    description: 'Low risk, stable returns',
    apy: 3.5,
    riskLevel: 'LOW' as const,
    minAmount: 100,
    tvl: 1250000
  },
  {
    id: 'strategy-2',
    name: 'Balanced',
    description: 'Medium risk, higher returns',
    apy: 5.2,
    riskLevel: 'MEDIUM' as const,
    minAmount: 500,
    tvl: 850000
  }
];

const mockStore = {
  yieldStrategies: mockYieldStrategies,
  fetchYieldStrategies: jest.fn(),
  createPayment: jest.fn(),
  totalBalance: 10250,
  totalYield: 425.5,
  pendingPayments: 3,
  payments: [],
  isLoadingPayments: false,
  fetchPayments: jest.fn(),
  bridgeTransactions: [],
  isLoadingBridgeTransactions: false,
  fetchBridgeTransactions: jest.fn(),
  initiateBridge: jest.fn(),
  isLoadingStrategies: false,
  sidebarOpen: false,
  setSidebarOpen: jest.fn(),
  theme: 'system' as const,
  setTheme: jest.fn(),
};

describe('PaymentForm', () => {
  beforeEach(() => {
    mockUseStore.mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  it('renders payment form with all required fields', () => {
    render(<PaymentForm />);
    
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/merchant id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/yield strategy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source chain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination chain/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create payment/i })).toBeInTheDocument();
  });

  it('shows WebSocket connection status', () => {
    render(<PaymentForm />);
    
    expect(screen.getByText(/real-time updates active/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);
    
    const submitButton = screen.getByRole('button', { name: /create payment/i });
    
    // Submit button should be disabled when required fields are empty
    expect(submitButton).toBeDisabled();
    
    // Try to submit the form
    await user.click(submitButton);
    
    // Since button is disabled, form won't submit and no error messages should appear
    // This is correct behavior - we don't show validation errors until actual submission attempt
    expect(screen.queryByText(/amount must be greater than 0/i)).not.toBeInTheDocument();
  });

  it('validates amount limits', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);
    
    const amountInput = screen.getByLabelText(/amount/i);
    
    // Test maximum amount - this should trigger real-time validation warning
    await user.type(amountInput, '75000');
    
    await waitFor(() => {
      // Should show warning for large payment
      expect(screen.getByText(/large payment may require additional verification/i)).toBeInTheDocument();
    });
    
    // Clear and test valid amount
    await user.clear(amountInput);
    await user.type(amountInput, '1000');
    
    await waitFor(() => {
      expect(screen.getByText(/payment amount looks good/i)).toBeInTheDocument();
    });
  });

  it('calculates yield estimation in real-time', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);
    
    // Fill in amount and select strategy
    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.selectOptions(screen.getByLabelText(/yield strategy/i), 'strategy-1');
    
    await waitFor(() => {
      expect(screen.getByText(/transaction summary/i)).toBeInTheDocument();
      expect(screen.getByText(/estimated yield/i)).toBeInTheDocument();
    });
  });

  it('calculates bridge fees for cross-chain transactions', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);
    
    // Fill in amount and select different chains
    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.selectOptions(screen.getByLabelText(/source chain/i), 'Ethereum');
    await user.selectOptions(screen.getByLabelText(/destination chain/i), 'Polygon');
    
    await waitFor(() => {
      expect(screen.getByText(/bridge fee/i)).toBeInTheDocument();
    });
  });

  it('shows real-time validation messages', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);
    
    // Type merchant ID
    await user.type(screen.getByLabelText(/merchant id/i), 'merchant_test');
    
    await waitFor(() => {
      expect(screen.getByText(/✓ valid merchant id/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    
    render(<PaymentForm onSubmit={onSubmit} />);
    
    // Fill in all required fields
    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.type(screen.getByLabelText(/merchant id/i), 'merchant_test');
    await user.type(screen.getByLabelText(/description/i), 'Test payment');
    await user.selectOptions(screen.getByLabelText(/yield strategy/i), 'strategy-1');
    
    const submitButton = screen.getByRole('button', { name: /create payment/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockStore.createPayment).toHaveBeenCalledWith({
        amount: 1000,
        status: 'PENDING',
        merchantName: 'merchant_test',
        description: 'Test payment',
        yieldAmount: expect.any(Number)
      });
    });
  });

  it('disables submit button when form is invalid', () => {
    render(<PaymentForm />);
    
    const submitButton = screen.getByRole('button', { name: /create payment/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockStore.createPayment.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<PaymentForm />);
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.type(screen.getByLabelText(/merchant id/i), 'merchant_test');
    await user.type(screen.getByLabelText(/description/i), 'Test payment');
    await user.selectOptions(screen.getByLabelText(/yield strategy/i), 'strategy-1');
    
    const submitButton = screen.getByRole('button', { name: /create payment/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/creating payment.../i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    
    render(<PaymentForm onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('populates form with initial data', () => {
    const initialData = {
      amount: '500',
      merchantId: 'merchant_initial',
      description: 'Initial payment'
    };
    
    render(<PaymentForm initialData={initialData} />);
    
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('merchant_initial')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial payment')).toBeInTheDocument();
  });

  it('fetches yield strategies on mount', () => {
    render(<PaymentForm />);
    
    expect(mockStore.fetchYieldStrategies).toHaveBeenCalled();
  });

  it('enables submit button when all required fields are filled', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);
    
    const submitButton = screen.getByRole('button', { name: /create payment/i });
    
    // Initially disabled
    expect(submitButton).toBeDisabled();
    
    // Fill in all required fields
    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.type(screen.getByLabelText(/merchant id/i), 'merchant_test');
    await user.type(screen.getByLabelText(/description/i), 'Test payment');
    await user.selectOptions(screen.getByLabelText(/yield strategy/i), 'strategy-1');
    
    // Should now be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});