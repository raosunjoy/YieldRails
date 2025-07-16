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
}

interface PaymentStatusProps {
  payment: Payment;
  onRefresh?: () => void;
  onCancel?: (paymentId: string) => void;
  onRelease?: (paymentId: string) => void;
  showActions?: boolean;
  realTimeUpdates?: boolean;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  payment,
  onRefresh,
  onCancel,
  onRelease,
  showActions = true,
  realTimeUpdates = true
}) => {
  const [currentPayment, setCurrentPayment] = useState(payment);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    // Simulate WebSocket connection
    const connectWebSocket = () => {
      console.log(`Connecting to WebSocket for payment ${currentPayment.id}`);
      
      // Simulate real-time payment updates
      const interval = setInterval(() => {
        // Simulate status updates for pending payments
        if (currentPayment.status === 'PENDING') {
          const random = Math.random();
          if (random < 0.1) { // 10% chance to update status
            setCurrentPayment(prev => ({
              ...prev,
              status: 'CONFIRMED',
              transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
            }));
            setLastUpdated(new Date());
            
            // Simulate WebSocket event
            console.log('WebSocket event: Payment confirmed');
          }
        } else if (currentPayment.status === 'CONFIRMED') {
          const random = Math.random();
          if (random < 0.05) { // 5% chance to complete
            setCurrentPayment(prev => ({
              ...prev,
              status: 'COMPLETED',
              yieldAmount: (prev.yieldAmount || 0) + Math.random() * 10
            }));
            setLastUpdated(new Date());
            
            // Simulate WebSocket event
            console.log('WebSocket event: Payment completed');
          }
        }
        
        // Simulate yield updates for active payments
        if (currentPayment.status === 'CONFIRMED' || currentPayment.status === 'PENDING') {
          const yieldUpdate = Math.random() * 0.5; // Small yield increment
          if (yieldUpdate > 0.3) {
            setCurrentPayment(prev => ({
              ...prev,
              yieldAmount: (prev.yieldAmount || 0) + yieldUpdate
            }));
            setLastUpdated(new Date());
          }
        }
      }, 3000); // Check every 3 seconds for more responsive updates

      return () => {
        clearInterval(interval);
        console.log(`Disconnected WebSocket for payment ${currentPayment.id}`);
      };
    };

    const cleanup = connectWebSocket();
    return cleanup;
  }, [currentPayment.id, currentPayment.status, realTimeUpdates]);

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

  const statusConfig = getStatusConfig(currentPayment.status);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing payment:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const canCancel = currentPayment.status === 'PENDING';
  const canRelease = currentPayment.status === 'CONFIRMED';

  return (
    <Card className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
          <p className="text-sm text-gray-500">ID: {currentPayment.id}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          isLoading={isUpdating}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Refresh
        </Button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-3 mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
          {statusConfig.icon}
          <span className="ml-2">{statusConfig.label}</span>
        </div>
        <span className="text-sm text-gray-500">{statusConfig.description}</span>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Progress</span>
          <span>
            {currentPayment.status === 'COMPLETED' ? '100%' : 
             currentPayment.status === 'CONFIRMED' ? '75%' :
             currentPayment.status === 'PENDING' ? '25%' : '0%'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              currentPayment.status === 'COMPLETED' ? 'bg-green-500 w-full' :
              currentPayment.status === 'CONFIRMED' ? 'bg-blue-500 w-3/4' :
              currentPayment.status === 'PENDING' ? 'bg-yellow-500 w-1/4' :
              'bg-gray-300 w-0'
            }`}
          />
        </div>
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">Amount</label>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(currentPayment.amount)} {currentPayment.currency || 'USDC'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Merchant</label>
            <p className="text-sm text-gray-900">{currentPayment.merchantName || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-sm text-gray-900">{formatDate(currentPayment.createdAt)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {currentPayment.yieldAmount && currentPayment.yieldAmount > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Yield Earned</label>
              <p className="text-lg font-semibold text-green-600">
                +{formatCurrency(currentPayment.yieldAmount)}
              </p>
            </div>
          )}
          
          {currentPayment.sourceChain && (
            <div>
              <label className="text-sm font-medium text-gray-500">Network</label>
              <p className="text-sm text-gray-900">
                {currentPayment.sourceChain}
                {currentPayment.destinationChain && currentPayment.sourceChain !== currentPayment.destinationChain && 
                  ` → ${currentPayment.destinationChain}`
                }
              </p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-500">Last Updated</label>
            <p className="text-sm text-gray-900">{formatDate(lastUpdated.toISOString())}</p>
          </div>
        </div>
      </div>

      {/* Transaction Hash */}
      {currentPayment.transactionHash && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <label className="text-sm font-medium text-gray-500">Transaction Hash</label>
          <div className="flex items-center space-x-2 mt-1">
            <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border flex-1 truncate">
              {currentPayment.transactionHash}
            </code>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigator.clipboard.writeText(currentPayment.transactionHash!)}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Description */}
      {currentPayment.description && (
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-500">Description</label>
          <p className="text-sm text-gray-900 mt-1">{currentPayment.description}</p>
        </div>
      )}

      {/* Actions */}
      {showActions && (canCancel || canRelease) && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          {canRelease && onRelease && (
            <Button
              onClick={() => onRelease(currentPayment.id)}
              className="flex-1"
            >
              Release Payment
            </Button>
          )}
          {canCancel && onCancel && (
            <Button
              variant="danger"
              onClick={() => onCancel(currentPayment.id)}
              className="flex-1"
            >
              Cancel Payment
            </Button>
          )}
        </div>
      )}

      {/* Real-time indicator */}
      {realTimeUpdates && (
        <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          Live updates enabled
        </div>
      )}
    </Card>
  );
};