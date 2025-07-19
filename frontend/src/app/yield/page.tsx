'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';

export default function YieldPage() {
  const { yieldStrategies, fetchYieldStrategies, isLoadingStrategies } = useStore();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [simulationAmount, setSimulationAmount] = useState<number>(1000);
  const [simulationDays, setSimulationDays] = useState<number>(30);
  const [simulationResults, setSimulationResults] = useState<any>(null);

  useEffect(() => {
    fetchYieldStrategies();
  }, [fetchYieldStrategies]);

  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategy(strategyId);
  };

  const handleSimulate = () => {
    const strategy = yieldStrategies.find(s => s.id === selectedStrategy);
    if (!strategy) return;

    const dailyRate = strategy.apy / 365 / 100;
    const totalYield = simulationAmount * Math.pow(1 + dailyRate, simulationDays) - simulationAmount;
    
    setSimulationResults({
      strategy: strategy.name,
      initialAmount: simulationAmount,
      days: simulationDays,
      totalYield: totalYield,
      finalAmount: simulationAmount + totalYield,
      apy: strategy.apy,
      dailyYield: simulationAmount * dailyRate,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Yield Management</h1>
          
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title="Available Yield Strategies">
                {isLoadingStrategies ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {yieldStrategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedStrategy === strategy.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                        onClick={() => handleStrategySelect(strategy.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {strategy.name}
                              </h3>
                              <span
                                className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeClass(
                                  strategy.riskLevel
                                )}`}
                              >
                                {strategy.riskLevel} Risk
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {strategy.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {strategy.apy}% <span className="text-sm font-normal">APY</span>
                            </p>
                            {strategy.tvl && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                TVL: {formatCurrency(strategy.tvl)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center text-sm">
                          <p className="text-gray-500 dark:text-gray-400">
                            Min Amount: {formatCurrency(strategy.minAmount)}
                          </p>
                          {selectedStrategy === strategy.id && (
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            
            <div>
              <Card title="Yield Simulator">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Amount (USD)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="amount"
                        className="input-stripe"
                        value={simulationAmount}
                        onChange={(e) => setSimulationAmount(Number(e.target.value))}
                        min="100"
                        step="100"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="days" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Time Period (Days)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="days"
                        className="input-stripe"
                        value={simulationDays}
                        onChange={(e) => setSimulationDays(Number(e.target.value))}
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="strategy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Strategy
                    </label>
                    <div className="mt-1">
                      <select
                        id="strategy"
                        className="input-stripe"
                        value={selectedStrategy || ''}
                        onChange={(e) => setSelectedStrategy(e.target.value)}
                      >
                        <option value="">Select a strategy</option>
                        {yieldStrategies.map((strategy) => (
                          <option key={strategy.id} value={strategy.id}>
                            {strategy.name} ({strategy.apy}% APY)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <Button
                    fullWidth
                    onClick={handleSimulate}
                    disabled={!selectedStrategy || simulationAmount <= 0 || simulationDays <= 0}
                  >
                    Calculate Yield
                  </Button>
                  
                  {simulationResults && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Simulation Results</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Strategy</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {simulationResults.strategy}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Initial Amount</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(simulationResults.initialAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Time Period</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {simulationResults.days} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">APY</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {simulationResults.apy}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Daily Yield</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(simulationResults.dailyYield)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Yield</span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(simulationResults.totalYield)}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Final Amount</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(simulationResults.finalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
              
              <Card title="Your Yield Performance" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Yield Earned</span>
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">$425.50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Current APY</span>
                    <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">4.15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Active Strategies</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">2</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button fullWidth variant="outline">
                      View Detailed Analytics
                    </Button>
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