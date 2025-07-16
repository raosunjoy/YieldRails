'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  merchantName?: string;
  yieldAmount?: number;
  description?: string;
  currency?: string;
  sourceChain?: string;
  destinationChain?: string;
  transactionHash?: string;
  estimatedCompletion?: string;
  recipientAddress?: string;
  senderAddress?: string;
  escrowAddress?: string;
  yieldStrategy?: string;
  networkFee?: number;
  platformFee?: number;
  bridgeFee?: number;
}

interface PaymentDetailsModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onCancel?: (paymentId: string) => Promise<void>;
  onRelease?: (paymentId: string) => Promise<void>;
  onRefresh?: (paymentId: string) => Promise<void>;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  payment,
  isOpen,
  onClose,
  onCancel,
  onRelease,
  onRefresh
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'cancel' | 'release' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<'cancel' | 'release' | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !payment) return null;

  const getStatusConfig = (status: Payment['status']) => {
    switch (status) {
      case 'PENDING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Pending',
          description: 'Payment is being processed'
        };
      case 'CONFIRMED':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Confirmed',
          description: 'Payment confirmed on blockchain'
        };
      case 'COMPLETED':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          label: 'Completed',
          description: 'Payment successfully completed'
        };
      case 'FAILED':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          label: 'Failed',
          description: 'Payment failed to process'
        };
      case 'CANCELLED':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          ),
          label: 'Cancelled',
          description: 'Payment was cancelled'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null,
          label: status,
          description: 'Unknown status'
        };
    }
  };

  const statusConfig = getStatusConfig(payment.status);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsLoading(true);
    try {
      await onRefresh(payment.id);
    } catch (error) {
      console.error('Error refreshing payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'cancel' | 'release') => {
    if (!payment) return;

    setActionLoading(action);
    try {
      if (action === 'cancel' && onCancel) {
        await onCancel(payment.id);
      } else if (action === 'release' && onRelease) {
        await onRelease(payment.id);
      }
      setShowConfirmation(null);
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const canCancel = payment.status === 'PENDING';
  const canRelease = payment.status === 'CONFIRMED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <Card className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                <p className="text-sm text-gray-500 mt-1">ID: {payment.id}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  isLoading={isLoading}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Status</h3>
                <div className="flex items-center space-x-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                    {statusConfig.icon}
                    <span className="ml-2">{statusConfig.label}</span>
                  </div>
                  <span className="text-sm text-gray-500">{statusConfig.description}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Progress</span>
                    <span>
                      {payment.status === 'COMPLETED' ? '100%' : 
                       payment.status === 'CONFIRMED' ? '75%' :
                       payment.status === 'PENDING' ? '25%' : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        payment.status === 'COMPLETED' ? 'bg-green-500 w-full' :
                        payment.status === 'CONFIRMED' ? 'bg-blue-500 w-3/4' :
                        payment.status === 'PENDING' ? 'bg-yellow-500 w-1/4' :
                        'bg-gray-300 w-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Amount</label>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(payment.amount)} {payment.currency || 'USDC'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Merchant</label>
                      <p className="text-sm text-gray-900">{payment.merchantName || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="text-sm text-gray-900">{payment.description || 'No description'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm text-gray-900">{formatDate(payment.createdAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {payment.yieldAmount && payment.yieldAmount > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Yield Earned</label>
                        <p className="text-xl font-semibold text-green-600">
                          +{formatCurrency(payment.yieldAmount)}
                        </p>
                      </div>
                    )}
                    
                    {payment.yieldStrategy && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Yield Strategy</label>
                        <p className="text-sm text-gray-900">{payment.yieldStrategy}</p>
                      </div>
                    )}
                    
                    {payment.sourceChain && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Network</label>
                        <p className="text-sm text-gray-900">
                          {payment.sourceChain}
                          {payment.destinationChain && payment.sourceChain !== payment.destinationChain && 
                            ` → ${payment.destinationChain}`
                          }
                        </p>
                      </div>
                    )}
                    
                    {payment.estimatedCompletion && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Estimated Completion</label>
                        <p className="text-sm text-gray-900">{formatDate(payment.estimatedCompletion)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Addresses Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Addresses</h3>
                <div className="space-y-3">
                  {payment.senderAddress && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Sender Address</label>
                        <code className="block text-xs text-gray-700 mt-1 font-mono">
                          {payment.senderAddress}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => copyToClipboard(payment.senderAddress!)}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                  
                  {payment.recipientAddress && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Recipient Address</label>
                        <code className="block text-xs text-gray-700 mt-1 font-mono">
                          {payment.recipientAddress}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => copyToClipboard(payment.recipientAddress!)}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                  
                  {payment.escrowAddress && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Escrow Address</label>
                        <code className="block text-xs text-gray-700 mt-1 font-mono">
                          {payment.escrowAddress}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => copyToClipboard(payment.escrowAddress!)}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Hash */}
              {payment.transactionHash && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Transaction</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Transaction Hash</label>
                      <code className="block text-xs text-gray-700 mt-1 font-mono">
                        {payment.transactionHash}
                      </code>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => copyToClipboard(payment.transactionHash!)}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => window.open(`https://etherscan.io/tx/${payment.transactionHash}`, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Fee Breakdown */}
              {(payment.networkFee || payment.platformFee || payment.bridgeFee) && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Fee Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    {payment.networkFee && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Network Fee:</span>
                        <span className="font-medium">{formatCurrency(payment.networkFee)}</span>
                      </div>
                    )}
                    {payment.platformFee && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fee:</span>
                        <span className="font-medium">{formatCurrency(payment.platformFee)}</span>
                      </div>
                    )}
                    {payment.bridgeFee && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bridge Fee:</span>
                        <span className="font-medium">{formatCurrency(payment.bridgeFee)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total Fees:</span>
                        <span>
                          {formatCurrency(
                            (payment.networkFee || 0) + 
                            (payment.platformFee || 0) + 
                            (payment.bridgeFee || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {(canCancel || canRelease) && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3">
                  {canRelease && onRelease && (
                    <>
                      {showConfirmation === 'release' ? (
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-sm text-gray-600">Are you sure you want to release this payment?</span>
                          <Button
                            size="sm"
                            onClick={() => handleAction('release')}
                            isLoading={actionLoading === 'release'}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirmation(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowConfirmation('release')}
                          className="flex-1"
                        >
                          Release Payment
                        </Button>
                      )}
                    </>
                  )}
                  
                  {canCancel && onCancel && (
                    <>
                      {showConfirmation === 'cancel' ? (
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-sm text-gray-600">Are you sure you want to cancel this payment?</span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleAction('cancel')}
                            isLoading={actionLoading === 'cancel'}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirmation(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="danger"
                          onClick={() => setShowConfirmation('cancel')}
                          className="flex-1"
                        >
                          Cancel Payment
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};