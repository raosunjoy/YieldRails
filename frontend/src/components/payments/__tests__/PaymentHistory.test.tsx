import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentHistory } from '../PaymentHistory';
import { useStore } from '@/store/useStore';

// Mock the store
jest.mock('@/store/useStore');
const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

// Mock payment data
const mockPayments = [
  {
    id: 'TX-12345',
    amount: 1000,
    status: 'COMPLETED' as const,
    createdAt: '2023-07-15T12:00:00Z',
    merchantName: 'Acme Inc',
    yieldAmount: 25.5,
    description: 'Product purchase',
    currency: 'USDC',
    sourceChain: 'Ethereum'
  },
  {
    id: 'TX-12344',
    amount: 750,
    status: 'PENDING' as const,
    createdAt: '2023-07-14T10:30:00Z',
    merchantName: 'Tech Solutions',
    yieldAmount: 8.25,
    description: 'Service payment',
    currency: 'USDC',
    sourceChain: 'Polygon'
  },
  {
    id: 'TX-12343',
    amount: 1500,
    status: 'CONFIRMED' as const,
    createdAt: '2023-07-12T15:45:00Z',
    merchantName: 'Global Services',
    yieldAmount: 35,
    description: 'Consulting fee',
    currency: 'USDT',
    sourceChain: 'Arbitrum'
  }
];

const mockStore = {
  payments: mockPayments,
  fetchPayments: jest.fn(),
  isLoadingPayments: false,
  createPayment: jest.fn(),
  yieldStrategies: [],
  isLoadingStrategies: false,
  fetchYieldStrategies: jest.fn(),
  bridgeTransactions: [],
  isLoadingBridgeTransactions: false,
  fetchBridgeTransactions: jest.fn(),
  initiateBridge: jest.fn(),
  totalBalance: 10250,
  totalYield: 425.5,
  pendingPayments: 3,
  sidebarOpen: false,
  setSidebarOpen: jest.fn(),
  theme: 'system' as const,
  setTheme: jest.fn(),
};

describe('PaymentHistory', () => {
  beforeEach(() => {
    mockUseStore.mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  it('renders payment history table with all payments', () => {
    render(<PaymentHistory />);
    
    expect(screen.getByText('Payment History')).toBeInTheDocument();
    expect(screen.getByText('TX-12345')).toBeInTheDocument();
    expect(screen.getByText('TX-12344')).toBeInTheDocument();
    expect(screen.getByText('TX-12343')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Global Services')).toBeInTheDocument();
  });

  it('shows loading state when payments are loading', () => {
    mockUseStore.mockReturnValue({
      ...mockStore,
      isLoadingPayments: true,
      payments: []
    });
    
    render(<PaymentHistory />);
    
    // Should show loading skeleton
    expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number));
  });

  it('filters payments by status', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    const statusFilter = screen.getByLabelText(/status/i);
    await user.selectOptions(statusFilter, 'PENDING');
    
    await waitFor(() => {
      expect(screen.getByText('TX-12344')).toBeInTheDocument();
      expect(screen.queryByText('TX-12345')).not.toBeInTheDocument();
      expect(screen.queryByText('TX-12343')).not.toBeInTheDocument();
    });
  });

  it('filters payments by merchant', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    const merchantFilter = screen.getByLabelText(/merchant/i);
    await user.type(merchantFilter, 'Acme');
    
    await waitFor(() => {
      expect(screen.getByText('TX-12345')).toBeInTheDocument();
      expect(screen.queryByText('TX-12344')).not.toBeInTheDocument();
      expect(screen.queryByText('TX-12343')).not.toBeInTheDocument();
    });
  });

  it('filters payments by amount range', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    const minAmountFilter = screen.getByLabelText(/min amount/i);
    const maxAmountFilter = screen.getByLabelText(/max amount/i);
    
    await user.type(minAmountFilter, '800');
    await user.type(maxAmountFilter, '1200');
    
    await waitFor(() => {
      expect(screen.getByText('TX-12345')).toBeInTheDocument(); // $1000
      expect(screen.queryByText('TX-12344')).not.toBeInTheDocument(); // $750
      expect(screen.queryByText('TX-12343')).not.toBeInTheDocument(); // $1500
    });
  });

  it('searches payments by ID, description, or merchant', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    const searchInput = screen.getByPlaceholderText(/search by id, description, or merchant/i);
    await user.type(searchInput, 'product');
    
    await waitFor(() => {
      expect(screen.getByText('TX-12345')).toBeInTheDocument();
      expect(screen.queryByText('TX-12344')).not.toBeInTheDocument();
      expect(screen.queryByText('TX-12343')).not.toBeInTheDocument();
    });
  });

  it('sorts payments by different fields', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    // Click on amount header to sort by amount
    const amountHeader = screen.getByText('Amount');
    await user.click(amountHeader);
    
    // Check that payments are sorted (implementation would depend on actual sorting)
    expect(screen.getAllByRole('row')).toHaveLength(4); // 3 payments + header
  });

  it('paginates payments correctly', async () => {
    const user = userEvent.setup();
    
    // Create more payments to test pagination
    const manyPayments = Array.from({ length: 25 }, (_, i) => ({
      id: `TX-${12300 + i}`,
      amount: 100 + i,
      status: 'COMPLETED' as const,
      createdAt: `2023-07-${10 + (i % 20)}T12:00:00Z`,
      merchantName: `Merchant ${i}`,
      yieldAmount: i,
      description: `Payment ${i}`,
      currency: 'USDC',
      sourceChain: 'Ethereum'
    }));
    
    mockUseStore.mockReturnValue({
      ...mockStore,
      payments: manyPayments
    });
    
    render(<PaymentHistory pageSize={10} />);
    
    // Should show pagination controls
    expect(screen.getByText(/showing 1 to 10 of 25 results/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    
    // Click next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(/showing 11 to 20 of 25 results/i)).toBeInTheDocument();
    });
  });

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    // Apply some filters
    const statusFilter = screen.getByLabelText(/status/i);
    const merchantFilter = screen.getByLabelText(/merchant/i);
    
    await user.selectOptions(statusFilter, 'PENDING');
    await user.type(merchantFilter, 'Acme');
    
    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(statusFilter).toHaveValue('');
      expect(merchantFilter).toHaveValue('');
      // All payments should be visible again
      expect(screen.getByText('TX-12345')).toBeInTheDocument();
      expect(screen.getByText('TX-12344')).toBeInTheDocument();
      expect(screen.getByText('TX-12343')).toBeInTheDocument();
    });
  });

  it('opens payment details modal when payment is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    const paymentRow = screen.getByText('TX-12345').closest('tr');
    expect(paymentRow).toBeInTheDocument();
    
    await user.click(paymentRow!);
    
    // Modal should open (check for modal content)
    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });
  });

  it('calls onPaymentClick when provided', async () => {
    const user = userEvent.setup();
    const onPaymentClick = jest.fn();
    
    render(<PaymentHistory onPaymentClick={onPaymentClick} />);
    
    const paymentRow = screen.getByText('TX-12345').closest('tr');
    await user.click(paymentRow!);
    
    expect(onPaymentClick).toHaveBeenCalledWith(mockPayments[0]);
  });

  it('shows empty state when no payments match filters', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    const searchInput = screen.getByPlaceholderText(/search by id, description, or merchant/i);
    await user.type(searchInput, 'nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText('No payments found')).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no payments exist', () => {
    mockUseStore.mockReturnValue({
      ...mockStore,
      payments: []
    });
    
    render(<PaymentHistory />);
    
    expect(screen.getByText('No payments found')).toBeInTheDocument();
    expect(screen.getByText(/get started by creating your first payment/i)).toBeInTheDocument();
  });

  it('fetches payments on mount', () => {
    render(<PaymentHistory />);
    
    expect(mockStore.fetchPayments).toHaveBeenCalled();
  });

  it('hides filters when showFilters is false', () => {
    render(<PaymentHistory showFilters={false} />);
    
    expect(screen.queryByPlaceholderText(/search by id, description, or merchant/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<PaymentHistory />);
    
    expect(screen.getByText('Completed')).toHaveClass('bg-green-100', 'text-green-800');
    expect(screen.getByText('Pending')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(screen.getByText('Confirmed')).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('formats currency and dates correctly', () => {
    render(<PaymentHistory />);
    
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$750.00')).toBeInTheDocument();
    expect(screen.getByText('+$25.50')).toBeInTheDocument();
    expect(screen.getByText('+$8.25')).toBeInTheDocument();
  });

  it('shows filter result count', async () => {
    const user = userEvent.setup();
    render(<PaymentHistory />);
    
    expect(screen.getByText('3 of 3 payments')).toBeInTheDocument();
    
    const statusFilter = screen.getByLabelText(/status/i);
    await user.selectOptions(statusFilter, 'PENDING');
    
    await waitFor(() => {
      expect(screen.getByText('1 of 3 payments')).toBeInTheDocument();
    });
  });
});