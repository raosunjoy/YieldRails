'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function MerchantSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'notifications' | 'api' | 'team'>('general');
  const [isEditing, setIsEditing] = useState(false);
  
  const [generalSettings, setGeneralSettings] = useState({
    businessName: 'Acme Inc',
    businessEmail: 'info@acmeinc.com',
    businessPhone: '+1 (555) 123-4567',
    businessAddress: '123 Main St, San Francisco, CA 94105',
    businessWebsite: 'https://www.acmeinc.com',
    businessDescription: 'Leading provider of innovative solutions',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    defaultYieldStrategy: 'balanced',
    autoWithdrawal: false,
    autoWithdrawalThreshold: '1000',
    withdrawalAddress: '0x1234...5678',
    preferredNetwork: 'Ethereum',
    paymentNotifications: true,
    yieldNotifications: true,
  });

  const handleInputChange = (section: string, field: string, value: string | boolean) => {
    if (section === 'general') {
      setGeneralSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    } else if (section === 'payment') {
      setPaymentSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSaveSettings = () => {
    // In a real app, make API call to update settings
    setIsEditing(false);
  };

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Merchant Settings</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure your merchant account settings
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Settings
                </Button>
              ) : (
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-md">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px overflow-x-auto">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`${
                    activeTab === 'general'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`${
                    activeTab === 'payment'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Payment & Yield
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`${
                    activeTab === 'notifications'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`${
                    activeTab === 'api'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  API Keys
                </button>
                <button
                  onClick={() => setActiveTab('team')}
                  className={`${
                    activeTab === 'team'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Team Members
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Business Information</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Update your business details and preferences
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-4">
                      <Input
                        label="Business Name"
                        value={generalSettings.businessName}
                        onChange={(e) => handleInputChange('general', 'businessName', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <Input
                        label="Business Email"
                        type="email"
                        value={generalSettings.businessEmail}
                        onChange={(e) => handleInputChange('general', 'businessEmail', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Input
                        label="Business Phone"
                        type="tel"
                        value={generalSettings.businessPhone}
                        onChange={(e) => handleInputChange('general', 'businessPhone', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <Input
                        label="Business Address"
                        value={generalSettings.businessAddress}
                        onChange={(e) => handleInputChange('general', 'businessAddress', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <Input
                        label="Business Website"
                        type="url"
                        value={generalSettings.businessWebsite}
                        onChange={(e) => handleInputChange('general', 'businessWebsite', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="business-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Business Description
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="business-description"
                          rows={3}
                          className="input-stripe"
                          value={generalSettings.businessDescription}
                          onChange={(e) => handleInputChange('general', 'businessDescription', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        className="mt-1 input-stripe"
                        value={generalSettings.timezone}
                        onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                        <option value="America/Denver">Mountain Time (US & Canada)</option>
                        <option value="America/Chicago">Central Time (US & Canada)</option>
                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Currency
                      </label>
                      <select
                        id="currency"
                        className="mt-1 input-stripe"
                        value={generalSettings.currency}
                        onChange={(e) => handleInputChange('general', 'currency', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Branding</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Customize your merchant branding
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-5">
                          <button
                            type="button"
                            className="bg-white dark:bg-gray-800 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            disabled={!isEditing}
                          >
                            Upload Logo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Payment Settings</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure your payment and yield preferences
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="default-yield-strategy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Default Yield Strategy
                      </label>
                      <select
                        id="default-yield-strategy"
                        className="mt-1 input-stripe"
                        value={paymentSettings.defaultYieldStrategy}
                        onChange={(e) => handleInputChange('payment', 'defaultYieldStrategy', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="conservative">Conservative (3.5% APY)</option>
                        <option value="balanced">Balanced (5.2% APY)</option>
                        <option value="aggressive">Aggressive (8.1% APY)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Automatic Withdrawals</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Automatically withdraw funds when they reach a threshold
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="auto-withdrawal"
                          name="auto-withdrawal"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={paymentSettings.autoWithdrawal}
                          onChange={(e) => handleInputChange('payment', 'autoWithdrawal', e.target.checked)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    {paymentSettings.autoWithdrawal && (
                      <div>
                        <Input
                          label="Withdrawal Threshold (USD)"
                          type="number"
                          value={paymentSettings.autoWithdrawalThreshold}
                          onChange={(e) => handleInputChange('payment', 'autoWithdrawalThreshold', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    )}

                    <div>
                      <Input
                        label="Withdrawal Address"
                        value={paymentSettings.withdrawalAddress}
                        onChange={(e) => handleInputChange('payment', 'withdrawalAddress', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label htmlFor="preferred-network" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Preferred Network
                      </label>
                      <select
                        id="preferred-network"
                        className="mt-1 input-stripe"
                        value={paymentSettings.preferredNetwork}
                        onChange={(e) => handleInputChange('payment', 'preferredNetwork', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="Ethereum">Ethereum</option>
                        <option value="Polygon">Polygon</option>
                        <option value="Arbitrum">Arbitrum</option>
                        <option value="Base">Base</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Payment Notifications</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure payment notification preferences
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Notifications</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receive notifications when payments are received or completed
                          </p>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="payment-notifications"
                            name="payment-notifications"
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            checked={paymentSettings.paymentNotifications}
                            onChange={(e) => handleInputChange('payment', 'paymentNotifications', e.target.checked)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Yield Notifications</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receive notifications about yield generation and performance
                          </p>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="yield-notifications"
                            name="yield-notifications"
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            checked={paymentSettings.yieldNotifications}
                            onChange={(e) => handleInputChange('payment', 'yieldNotifications', e.target.checked)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notification Preferences</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure how you receive notifications
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications via email
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="email-notifications"
                          name="email-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SMS Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications via SMS
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="sms-notifications"
                          name="sms-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Push Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive push notifications on your devices
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="push-notifications"
                          name="push-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Webhook Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Send notifications to your webhook endpoint
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="webhook-notifications"
                          name="webhook-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Webhook Configuration</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure webhook endpoints for real-time notifications
                    </p>

                    <div className="mt-4">
                      <Input
                        label="Webhook URL"
                        type="url"
                        placeholder="https://your-domain.com/webhook"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="webhook-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Webhook Secret
                      </label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="password"
                          id="webhook-secret"
                          className="input-stripe flex-1"
                          placeholder="••••••••••••••••"
                          disabled={!isEditing}
                        />
                        <button
                          type="button"
                          className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          disabled={!isEditing}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">API Keys</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Manage API keys for programmatic access to your merchant account
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Live API Key</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Use this key for production environments
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                          sk_live_••••••••••••••••
                        </span>
                        <button
                          type="button"
                          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          Show
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Test API Key</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Use this key for testing and development
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                          sk_test_••••••••••••••••
                        </span>
                        <button
                          type="button"
                          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          Show
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <Button>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Generate New API Key
                    </Button>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">API Access Control</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure API access restrictions
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="allowed-origins" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Allowed Origins (CORS)
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="allowed-origins"
                            className="input-stripe"
                            placeholder="https://your-domain.com, https://app.your-domain.com"
                            disabled={!isEditing}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Comma-separated list of domains allowed to make API requests
                        </p>
                      </div>

                      <div>
                        <label htmlFor="ip-restrictions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          IP Restrictions
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="ip-restrictions"
                            className="input-stripe"
                            placeholder="192.168.1.1, 10.0.0.1/24"
                            disabled={!isEditing}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Comma-separated list of IP addresses or CIDR ranges allowed to make API requests
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Team Members</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Manage team members and their access permissions
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                <span className="text-indigo-700 dark:text-indigo-300 font-medium text-lg">
                                  J
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">John Smith</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            john@acmeinc.com
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            Admin
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-success">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              disabled={!isEditing}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                <span className="text-indigo-700 dark:text-indigo-300 font-medium text-lg">
                                  J
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Jane Doe</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            jane@acmeinc.com
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            Manager
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-success">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              disabled={!isEditing}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                <span className="text-indigo-700 dark:text-indigo-300 font-medium text-lg">
                                  R
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Robert Johnson</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            robert@acmeinc.com
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            Viewer
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-warning">
                              Invited
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              disabled={!isEditing}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex">
                    <Button disabled={!isEditing}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Invite Team Member
                    </Button>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Role Permissions</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure permissions for each role
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Full access to all features and settings
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Manager</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Can manage payments, customers, and view analytics
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Viewer</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Read-only access to payments and analytics
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}