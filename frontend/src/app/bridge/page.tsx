'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/store/useStore';

export default function BridgePage() {
  const { bridgeTransactions, fetchBridgeTransactions, initiateBridge, isLoadingBridgeTransactions } = useStore();
  
  const [amount, setAmount] = useState<string>('');
  const [sourceChain, setSourceChain] = useState<string>('Ethereum');
  const [destinationChain, setDestinationChain] = useState<string>('Polygon');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [estimatedFee, setEstimatedFee] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchBridgeTransactions();
  }, [fetchBridgeTransactions]);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      // Calculate estimated fee (2.5% of amount)
      const fee = parseFloat(amount) * 0.025;
      setEstimatedFee(fee);
      
      // Estimate time based on chains
      if (sourceChain === destinationChain) {
        setEstimatedTime('N/A - Same chain');
      } else if (sourceChain === 'Ethereum' && destinationChain === 'Polygon') {
        setEstimatedTime('~10 minutes');
      } else if (sourceChain === 'Ethereum' && destinationChain === 'Arbitrum') {
        setEstimatedTime('~15 minutes');
      } else if (sourceChain === 'Polygon' && destinationChain === 'Ethereum') {
        setEstimatedTime('~20 minutes');
      } else {
        setEstimatedTime('~30 minutes');
      }
    } else {
      setEstimatedFee(0);
      setEstimatedTime('');
    }
  }, [amount, sourceChain, destinationChain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (sourceChain === destinationChain) {
      setError('Source and destination chains must be different');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await initiateBridge(sourceChain, destinationChain, parseFloat(amount));
      setAmount('');
      // Refresh the transaction list
      fetchBridgeTransactions();
    } catch (err) {
      setError('Failed to initiate bridge transaction. Please try again.');
      console.error('Bridge error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'COMPLETED':
        return <span className={`${baseClasses} status-success`}>Completed</span>;
      case 'PENDING':
        return <span className={`${baseClasses} status-warning`}>Pending</span>;
      case 'FAILED':
        return <span className={`${baseClasses} status-error`}>Failed</span>;
      default:
        return <span className={`${baseClasses} status-info`}>{status}</span>;
    }
  };

  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Solana', 'XRPL'];

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Cross-Chain Bridge</h1>
          
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <Card title="Bridge Funds">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="sourceChain" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Source Chain
                    </label>
                    <select
                      id="sourceChain"
                      className="input-stripe mt-1"
                      value={sourceChain}
                      onChange={(e) => setSourceChain(e.target.value)}
                    >
                      {chains.map((chain) => (
                        <option key={`source-${chain}`} value={chain}>
                          {chain}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => {
                        const temp = sourceChain;
                        setSourceChain(destinationChain);
                        setDestinationChain(temp);
                      }}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                  </div>
                  
                  <div>
                    <label htmlFor="destinationChain" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Destination Chain
                    </label>
                    <select
                      id="destinationChain"
                      className="input-stripe mt-1"
                      value={destinationChain}
                      onChange={(e) => setDestinationChain(e.target.value)}
                    >
                      {chains.map((chain) => (
                        <option key={`dest-${chain}`} value={chain}>
                          {chain}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <Input
                    label="Amount (USDC)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    }
                  />
                  
                  {(estimatedFee > 0 || estimatedTime) && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Summary</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Amount</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {amount ? formatCurrency(parseFloat(amount)) : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Bridge Fee</span>
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            {estimatedFee > 0 ? `- ${formatCurrency(estimatedFee)}` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Estimated Time</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {estimatedTime || '-'}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">You will receive</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                              {amount && estimatedFee > 0
                                ? formatCurrency(parseFloat(amount) - estimatedFee)
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={!amount || parseFloat(amount) <= 0 || sourceChain === destinationChain}
                  >
                    Bridge Funds
                  </Button>
                </form>
              </Card>
              
              <Card title="Bridge Information" className="mt-6">
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Supported Chains</h4>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Ethereum, Polygon, Arbitrum, Base, Solana, XRPL
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Supported Tokens</h4>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      USDC, USDT, DAI
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Bridge Technology</h4>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      YieldRails uses Circle CCTP for USDC transfers and custom bridge contracts for other tokens.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Yield During Transit</h4>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Your funds continue to generate yield during the bridge process. Yield is calculated based on the time in transit.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card title="Bridge Transactions">
                {isLoadingBridgeTransactions ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                  </div>
                ) : bridgeTransactions.length === 0 ? (
                  <div className="py-6 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No bridge transactions</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Start by bridging funds between chains.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Route
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {bridgeTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {tx.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <span>{tx.sourceChain}</span>
                                <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                                <span>{tx.destinationChain}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(tx.amount)}
                              {tx.fee && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                  (Fee: {formatCurrency(tx.fee)})
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(tx.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(tx.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              
              <Card title="Bridge Security" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Multi-Validator Consensus</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        All bridge transactions require consensus from multiple validators for enhanced security.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Automatic Refunds</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        If a bridge transaction fails, funds are automatically refunded to the source address.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Real-time Monitoring</h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        All bridge transactions are monitored in real-time with automated alerts for any anomalies.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}