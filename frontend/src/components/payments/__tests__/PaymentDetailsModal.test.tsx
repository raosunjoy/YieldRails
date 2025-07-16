import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentDetailsModal } from '../PaymentDetailsModal';

// Mock payment data
const mockPayment = {
  id: 'TX-12345',
  amount: 1000,
  status: 'CONFIRMED' as const,
  createdAt: '2023-07-15T12:00:00Z',
  merchantName: 'Test Merchant',
  yieldAmount: 25.5,
  description: 'Test payment description',
  currency: 'USDC',
  sourceChain: 'Ethereum',
  destinationChain: 'Polygon',
  transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
  estimatedCompletion: '2023-07-16T12:00:00Z',
  recipientAddress: '0xrecipient1234567890abcdef1234567890abcdef',
  senderAddress: '0xsender1234567890abcdef1234567890abcdef12',
  escrowAddress: '0xescrow1234567890abcdef1234567890abcdef12',
  yieldStrategy: 'Conservative Strategy',
  networkFee: 5.0,
  platformFee: 2.5,
  bridgeFee: 10.0
};

describe('PaymentDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  it('renders modal when open with payment data', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByText('TX-12345')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00 USDC')).toBeInTheDocument();
    expect(screen.getByText('Test Merchant')).toBeInTheDocument();
    expect(screen.getByText('Test payment description')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={false}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.queryByText('Payment Details')).not.toBeInTheDocument();
  });

  it('does not render when payment is null', () => {
    render(
      <PaymentDetailsModal
        payment={null}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.queryByText('Payment Details')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={onClose}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={onClose}
      />
    );
    
    // Click on backdrop (the overlay div)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).toBeInTheDocument();
    
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows correct status and progress for confirmed payment', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Payment confirmed on blockchain')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows all payment information sections', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('Transaction')).toBeInTheDocument();
    expect(screen.getByText('Fee Breakdown')).toBeInTheDocument();
  });

  it('displays all address information with copy buttons', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Sender Address')).toBeInTheDocument();
    expect(screen.getByText('Recipient Address')).toBeInTheDocument();
    expect(screen.getByText('Escrow Address')).toBeInTheDocument();
    
    // Should have copy buttons for each address
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('copies address to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    await user.click(copyButtons[0]); // Click first copy button
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('shows transaction hash with copy and view buttons', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
    expect(screen.getByText('0x1234567890abcdef1234567890abcdef12345678')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
  });

  it('opens etherscan when view transaction button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock window.open
    const mockOpen = jest.fn();
    Object.assign(window, { open: mockOpen });
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    const viewButton = screen.getByRole('button', { name: /view/i });
    await user.click(viewButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/tx/${mockPayment.transactionHash}`,
      '_blank'
    );
  });

  it('displays fee breakdown correctly', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Network Fee:')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('Platform Fee:')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
    expect(screen.getByText('Bridge Fee:')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('Total Fees:')).toBeInTheDocument();
    expect(screen.getByText('$17.50')).toBeInTheDocument();
  });

  it('shows release button for confirmed payments', () => {
    const onRelease = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
        onRelease={onRelease}
      />
    );
    
    expect(screen.getByRole('button', { name: /release payment/i })).toBeInTheDocument();
  });

  it('shows cancel button for pending payments', () => {
    const pendingPayment = { ...mockPayment, status: 'PENDING' as const };
    const onCancel = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={pendingPayment}
        isOpen={true}
        onClose={jest.fn()}
        onCancel={onCancel}
      />
    );
    
    expect(screen.getByRole('button', { name: /cancel payment/i })).toBeInTheDocument();
  });

  it('shows confirmation dialog when release is clicked', async () => {
    const user = userEvent.setup();
    const onRelease = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
        onRelease={onRelease}
      />
    );
    
    const releaseButton = screen.getByRole('button', { name: /release payment/i });
    await user.click(releaseButton);
    
    expect(screen.getByText(/are you sure you want to release this payment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('shows confirmation dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    const pendingPayment = { ...mockPayment, status: 'PENDING' as const };
    const onCancel = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={pendingPayment}
        isOpen={true}
        onClose={jest.fn()}
        onCancel={onCancel}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancel payment/i });
    await user.click(cancelButton);
    
    expect(screen.getByText(/are you sure you want to cancel this payment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('calls onRelease when release is confirmed', async () => {
    const user = userEvent.setup();
    const onRelease = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
        onRelease={onRelease}
      />
    );
    
    const releaseButton = screen.getByRole('button', { name: /release payment/i });
    await user.click(releaseButton);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    expect(onRelease).toHaveBeenCalledWith('TX-12345');
  });

  it('calls onCancel when cancel is confirmed', async () => {
    const user = userEvent.setup();
    const pendingPayment = { ...mockPayment, status: 'PENDING' as const };
    const onCancel = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={pendingPayment}
        isOpen={true}
        onClose={jest.fn()}
        onCancel={onCancel}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancel payment/i });
    await user.click(cancelButton);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    expect(onCancel).toHaveBeenCalledWith('TX-12345');
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
        onRefresh={onRefresh}
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalledWith('TX-12345');
  });

  it('shows loading state during refresh', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
        onRefresh={onRefresh}
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(refreshButton).toBeDisabled();
  });

  it('formats dates correctly', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    // Check that dates are formatted (exact format may vary by locale)
    expect(screen.getByText(/July 15, 2023/)).toBeInTheDocument();
  });

  it('handles payment without optional fields gracefully', () => {
    const minimalPayment = {
      id: 'TX-12346',
      amount: 500,
      status: 'PENDING' as const,
      createdAt: '2023-07-15T12:00:00Z'
    };
    
    render(
      <PaymentDetailsModal
        payment={minimalPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('TX-12346')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument(); // For missing merchant
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('prevents body scroll when modal is open', () => {
    const { rerender } = render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={false}
        onClose={jest.fn()}
      />
    );
    
    expect(document.body.style.overflow).toBe('unset');
  });

  it('shows network information correctly', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Ethereum → Polygon')).toBeInTheDocument();
  });

  it('shows yield information when available', () => {
    render(
      <PaymentDetailsModal
        payment={mockPayment}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Yield Earned')).toBeInTheDocument();
    expect(screen.getByText('+$25.50')).toBeInTheDocument();
    expect(screen.getByText('Conservative Strategy')).toBeInTheDocument();
  });
});