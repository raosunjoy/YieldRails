'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/store/useStore';

interface PaymentFormData {
  amount: string;
  currency: string;
  merchantId: string;
  description: string;
  yieldStrategy: string;
  sourceChain: string;
  destinationChain: string;
}

interface PaymentFormProps {
  onSubmit?: (data: PaymentFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<PaymentFormData>;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {}
}) => {
  const { yieldStrategies, fetchYieldStrategies, createPayment } = useStore();
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    currency: 'USDC',
    merchantId: '',
    description: '',
    yieldStrategy: '',
    sourceChain: 'Ethereum',
    destinationChain: 'Ethereum',
    ...initialData
  });
  
  const [errors, setErrors] = useState<Partial<PaymentFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedYield, setEstimatedYield] = useState<number>(0);
  const [estimatedFees, setEstimatedFees] = useState<number>(0);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    fetchYieldStrategies();
  }, [fetchYieldStrategies]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Simulate WebSocket connection
    const connectWebSocket = () => {
      // In a real implementation, this would be a WebSocket connection
      setWsConnected(true);
      
      // Simulate connection status updates
      const interval = setInterval(() => {
        setWsConnected(prev => {
          // Simulate occasional disconnections
          if (Math.random() < 0.05) return false;
          return true;
        });
      }, 5000);

      return () => clearInterval(interval);
    };

    const cleanup = connectWebSocket();
    return cleanup;
  }, []);

  // Real-time validation with debouncing
  const validateFieldRealTime = useCallback(async (field: keyof PaymentFormData, value: string) => {
    if (!value) return;
    
    setIsValidating(true);
    setValidationMessages([]);
    
    try {
      // Simulate API validation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const messages: string[] = [];
      
      if (field === 'merchantId') {
        // Simulate merchant validation
        if (value.length < 3) {
          messages.push('Merchant ID too short');
        } else if (!value.startsWith('merchant_')) {
          messages.push('Merchant ID should start with "merchant_"');
        } else {
          messages.push('✓ Valid merchant ID');
        }
      }
      
      if (field === 'amount') {
        const amount = parseFloat(value);
        if (amount > 0) {
          if (amount < 10) {
            messages.push('⚠ Small payment amount may have higher relative fees');
          } else if (amount > 50000) {
            messages.push('⚠ Large payment may require additional verification');
          } else {
            messages.push('✓ Payment amount looks good');
          }
        }
      }
      
      setValidationMessages(messages);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.merchantId) {
        validateFieldRealTime('merchantId', formData.merchantId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.merchantId, validateFieldRealTime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.amount) {
        validateFieldRealTime('amount', formData.amount);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.amount, validateFieldRealTime]);

  // Real-time yield estimation
  useEffect(() => {
    if (formData.amount && formData.yieldStrategy) {
      const amount = parseFloat(formData.amount);
      const strategy = yieldStrategies.find(s => s.id === formData.yieldStrategy);
      
      if (amount > 0 && strategy) {
        // Estimate yield for 30 days (typical payment escrow period)
        const dailyRate = strategy.apy / 365 / 100;
        const estimatedDailyYield = amount * dailyRate * 30;
        setEstimatedYield(estimatedDailyYield);
      } else {
        setEstimatedYield(0);
      }
    }
  }, [formData.amount, formData.yieldStrategy, yieldStrategies]);

  // Real-time fee estimation
  useEffect(() => {
    if (formData.amount && formData.sourceChain !== formData.destinationChain) {
      const amount = parseFloat(formData.amount);
      if (amount > 0) {
        // Cross-chain bridge fee (2.5%)
        setEstimatedFees(amount * 0.025);
      } else {
        setEstimatedFees(0);
      }
    } else {
      setEstimatedFees(0);
    }
  }, [formData.amount, formData.sourceChain, formData.destinationChain]);

  const validateForm = (): boolean => {
    const newErrors: Partial<PaymentFormData> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (parseFloat(formData.amount) > 100000) {
      newErrors.amount = 'Amount cannot exceed $100,000';
    }

    if (!formData.merchantId.trim()) {
      newErrors.merchantId = 'Merchant ID is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.yieldStrategy) {
      newErrors.yieldStrategy = 'Please select a yield strategy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const paymentData = {
        amount: parseFloat(formData.amount),
        status: 'PENDING' as const,
        merchantName: formData.merchantId,
        description: formData.description,
        yieldAmount: estimatedYield
      };

      await createPayment(paymentData);
      
      if (onSubmit) {
        onSubmit(formData);
      }
      
      // Reset form
      setFormData({
        amount: '',
        currency: 'USDC',
        merchantId: '',
        description: '',
        yieldStrategy: '',
        sourceChain: 'Ethereum',
        destinationChain: 'Ethereum'
      });
      
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card title="Create Payment" className="max-w-2xl mx-auto">
      {/* WebSocket Status Indicator */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-sm text-gray-600">
            {wsConnected ? 'Real-time updates active' : 'Connection lost - retrying...'}
          </span>
        </div>
        {isValidating && (
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-gray-600">Validating...</span>
          </div>
        )}
      </div>

      {/* Real-time Validation Messages */}
      {validationMessages.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-1">
            {validationMessages.map((message, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className={`${
                  message.startsWith('✓') ? 'text-green-600' : 
                  message.startsWith('⚠') ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              max="100000"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={errors.amount}
              placeholder="0.00"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              }
            />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="input-stripe"
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="DAI">DAI</option>
            </select>
          </div>
        </div>

        {/* Merchant Information */}
        <Input
          label="Merchant ID"
          value={formData.merchantId}
          onChange={(e) => handleInputChange('merchantId', e.target.value)}
          error={errors.merchantId}
          placeholder="merchant_123"
          helperText="The merchant who will receive this payment"
        />

        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          error={errors.description}
          placeholder="Payment for services"
          helperText="Brief description of the payment purpose"
        />

        {/* Yield Strategy Selection */}
        <div>
          <label htmlFor="yield-strategy" className="block text-sm font-medium text-gray-700 mb-1">
            Yield Strategy
          </label>
          <select
            id="yield-strategy"
            value={formData.yieldStrategy}
            onChange={(e) => handleInputChange('yieldStrategy', e.target.value)}
            className={`input-stripe ${errors.yieldStrategy ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
          >
            <option value="">Select a strategy</option>
            {yieldStrategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name} - {strategy.apy}% APY ({strategy.riskLevel} Risk)
              </option>
            ))}
          </select>
          {errors.yieldStrategy && (
            <p className="text-sm text-red-600 mt-1">{errors.yieldStrategy}</p>
          )}
        </div>

        {/* Chain Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="source-chain" className="block text-sm font-medium text-gray-700 mb-1">Source Chain</label>
            <select
              id="source-chain"
              value={formData.sourceChain}
              onChange={(e) => handleInputChange('sourceChain', e.target.value)}
              className="input-stripe"
            >
              <option value="Ethereum">Ethereum</option>
              <option value="Polygon">Polygon</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Base">Base</option>
            </select>
          </div>
          <div>
            <label htmlFor="destination-chain" className="block text-sm font-medium text-gray-700 mb-1">Destination Chain</label>
            <select
              id="destination-chain"
              value={formData.destinationChain}
              onChange={(e) => handleInputChange('destinationChain', e.target.value)}
              className="input-stripe"
            >
              <option value="Ethereum">Ethereum</option>
              <option value="Polygon">Polygon</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Base">Base</option>
            </select>
          </div>
        </div>

        {/* Estimation Summary */}
        {(estimatedYield > 0 || estimatedFees > 0) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Transaction Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-medium">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
              </div>
              {estimatedYield > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Yield (30 days):</span>
                  <span className="font-medium text-green-600">+{formatCurrency(estimatedYield)}</span>
                </div>
              )}
              {estimatedFees > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Bridge Fee:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(estimatedFees)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-1 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Net Amount:</span>
                  <span>{formatCurrency((parseFloat(formData.amount) || 0) + estimatedYield - estimatedFees)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex-1"
            disabled={!formData.amount || !formData.merchantId || !formData.yieldStrategy}
          >
            {isSubmitting ? 'Creating Payment...' : 'Create Payment'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};