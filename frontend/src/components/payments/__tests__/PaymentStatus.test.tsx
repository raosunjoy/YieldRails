import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentStatus } from '../PaymentStatus';

// Mock payment data
const mockPayment = {
  id: 'TX-12345',
  amount: 1000,
  status: 'PENDING' as const,
  createdAt: '2023-07-15T12:00:00Z',
  merchantName: 'Test Merchant',
  yieldAmount: 25.5,
  description: 'Test payment',
  currency: 'USDC',
  sourceChain: 'Ethereum',
  destinationChain: 'Polygon',
  transactionHash: '0x1234567890abcdef',
  estimatedCompletion: '2023-07-16T12:00:00Z'
};

describe('PaymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment status with all details', () => {
    render(<PaymentStatus payment={mockPayment} />);
    
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getByText('TX-12345')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00 USDC')).toBeInTheDocument();
    expect(screen.getByText('Test Merchant')).toBeInTheDocument();
    expect(screen.getByText('+$25.50')).toBeInTheDocument();
    expect(screen.getByText('Ethereum → Polygon')).toBeInTheDocument();
  });

  it('shows correct status badge and progress for pending payment', () => {
    render(<PaymentStatus payment={mockPayment} />);
    
    const statusBadge = screen.getByText('Pending');
    expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows correct status badge and progress for confirmed payment', () => {
    const confirmedPayment = { ...mockPayment, status: 'CONFIRMED' as const };
    render(<PaymentStatus payment={confirmedPayment} />);
    
    const statusBadge = screen.getByText('Confirmed');
    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows correct status badge and progress for completed payment', () => {
    const completedPayment = { ...mockPayment, status: 'COMPLETED' as const };
    render(<PaymentStatus payment={completedPayment} />);
    
    const statusBadge = screen.getByText('Completed');
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows transaction hash when available', () => {
    render(<PaymentStatus payment={mockPayment} />);
    
    expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
    expect(screen.getByText('0x1234567890abcdef')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    
    render(<PaymentStatus payment={mockPayment} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows loading state during refresh', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<PaymentStatus payment={mockPayment} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    // Check for loading state (button should be disabled or show loading)
    expect(refreshButton).toBeDisabled();
  });

  it('shows release button for confirmed payments', () => {
    const confirmedPayment = { ...mockPayment, status: 'CONFIRMED' as const };
    const onRelease = jest.fn();
    
    render(<PaymentStatus payment={confirmedPayment} onRelease={onRelease} />);
    
    expect(screen.getByRole('button', { name: /release payment/i })).toBeInTheDocument();
  });

  it('shows cancel button for pending payments', () => {
    const onCancel = jest.fn();
    
    render(<PaymentStatus payment={mockPayment} onCancel={onCancel} />);
    
    expect(screen.getByRole('button', { name: /cancel payment/i })).toBeInTheDocument();
  });

  it('calls onRelease when release button is clicked', async () => {
    const user = userEvent.setup();
    const confirmedPayment = { ...mockPayment, status: 'CONFIRMED' as const };
    const onRelease = jest.fn();
    
    render(<PaymentStatus payment={confirmedPayment} onRelease={onRelease} />);
    
    const releaseButton = screen.getByRole('button', { name: /release payment/i });
    await user.click(releaseButton);
    
    expect(onRelease).toHaveBeenCalledWith('TX-12345');
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    
    render(<PaymentStatus payment={mockPayment} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel payment/i });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledWith('TX-12345');
  });

  it('hides actions when showActions is false', () => {
    const onCancel = jest.fn();
    
    render(<PaymentStatus payment={mockPayment} onCancel={onCancel} showActions={false} />);
    
    expect(screen.queryByRole('button', { name: /cancel payment/i })).not.toBeInTheDocument();
  });

  it('shows real-time updates indicator when enabled', () => {
    render(<PaymentStatus payment={mockPayment} realTimeUpdates={true} />);
    
    expect(screen.getByText(/live updates enabled/i)).toBeInTheDocument();
  });

  it('hides real-time updates indicator when disabled', () => {
    render(<PaymentStatus payment={mockPayment} realTimeUpdates={false} />);
    
    expect(screen.queryByText(/live updates enabled/i)).not.toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<PaymentStatus payment={mockPayment} />);
    
    expect(screen.getByText('$1,000.00 USDC')).toBeInTheDocument();
    expect(screen.getByText('+$25.50')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<PaymentStatus payment={mockPayment} />);
    
    // Check that date is formatted (exact format may vary by locale)
    expect(screen.getByText(/Jul 15, 2023/)).toBeInTheDocument();
  });

  it('copies transaction hash to clipboard', async () => {
    const user = userEvent.setup();
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
    
    render(<PaymentStatus payment={mockPayment} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0x1234567890abcdef');
  });

  it('handles payment without optional fields', () => {
    const minimalPayment = {
      id: 'TX-12346',
      amount: 500,
      status: 'PENDING' as const,
      createdAt: '2023-07-15T12:00:00Z'
    };
    
    render(<PaymentStatus payment={minimalPayment} />);
    
    expect(screen.getByText('TX-12346')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument(); // For missing merchant
  });

  it('updates payment status in real-time', async () => {
    const { rerender } = render(<PaymentStatus payment={mockPayment} realTimeUpdates={true} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    
    // Simulate real-time update
    const updatedPayment = { ...mockPayment, status: 'CONFIRMED' as const };
    rerender(<PaymentStatus payment={updatedPayment} realTimeUpdates={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });
  });

  it('shows failed status correctly', () => {
    const failedPayment = { ...mockPayment, status: 'FAILED' as const };
    render(<PaymentStatus payment={failedPayment} />);
    
    const statusBadge = screen.getByText('Failed');
    expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800');
    expect(screen.getByText('Payment failed to process')).toBeInTheDocument();
  });

  it('shows cancelled status correctly', () => {
    const cancelledPayment = { ...mockPayment, status: 'CANCELLED' as const };
    render(<PaymentStatus payment={cancelledPayment} />);
    
    const statusBadge = screen.getByText('Cancelled');
    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    expect(screen.getByText('Payment was cancelled')).toBeInTheDocument();
  });
});