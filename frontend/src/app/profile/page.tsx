'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, connectWallet } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'kyc'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    country: '',
    timezone: 'UTC',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = () => {
    // In a real app, make API call to update profile
    setIsEditing(false);
  };

  const handleConnectWallet = async () => {
    if (!walletAddress) return;
    
    setIsConnecting(true);
    try {
      await connectWallet(walletAddress);
      setWalletAddress('');
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const getKycStatusBadge = (status?: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'APPROVED':
        return <span className={`${baseClasses} status-success`}>Approved</span>;
      case 'PENDING':
        return <span className={`${baseClasses} status-warning`}>Pending</span>;
      case 'REJECTED':
        return <span className={`${baseClasses} status-error`}>Rejected</span>;
      default:
        return <span className={`${baseClasses} status-info`}>Not Started</span>;
    }
  };

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Profile Settings</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center">
              <div className="mr-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">KYC Status:</span>{' '}
                {getKycStatusBadge(user?.kycStatus)}
              </div>
              <Button
                variant={user?.kycStatus === 'APPROVED' ? 'secondary' : 'primary'}
                disabled={user?.kycStatus === 'APPROVED'}
              >
                {user?.kycStatus === 'APPROVED' ? 'KYC Verified' : 'Complete KYC'}
              </Button>
            </div>
          </div>

          <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-md">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${
                    activeTab === 'profile'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`${
                    activeTab === 'security'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Security
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`${
                    activeTab === 'preferences'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Preferences
                </button>
                <button
                  onClick={() => setActiveTab('kyc')}
                  className={`${
                    activeTab === 'kyc'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  KYC Verification
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Personal Information</h3>
                    {!isEditing ? (
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    ) : (
                      <div className="flex space-x-3">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveProfile}>Save Changes</Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <Input
                        label="First name"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Input
                        label="Last name"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <Input
                        label="Email address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Input
                        label="Phone number"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Input
                        label="Country"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Wallet Connection</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Connect your wallet to enable blockchain transactions
                    </p>

                    <div className="mt-4">
                      {user?.walletAddress ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Connected Wallet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <div className="flex space-x-3">
                          <Input
                            placeholder="Enter wallet address"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleConnectWallet}
                            isLoading={isConnecting}
                            disabled={!walletAddress}
                          >
                            Connect
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Change Password</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Update your password to keep your account secure
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Current password"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Input
                      label="New password"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <Button>Update Password</Button>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Add an extra layer of security to your account
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Not enabled
                          </p>
                        </div>
                        <Button>Enable 2FA</Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">API Keys</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Manage API keys for programmatic access
                    </p>

                    <div className="mt-4">
                      <Button variant="outline">Generate API Key</Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notification Settings</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Manage how you receive notifications
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive email notifications for important events
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="email-notifications"
                          name="email-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Payment Updates</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications when payment status changes
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="payment-updates"
                          name="payment-updates"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Yield Alerts</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications about yield performance
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="yield-alerts"
                          name="yield-alerts"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Marketing Communications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive updates about new features and promotions
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="marketing-comms"
                          name="marketing-comms"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Yield Strategy Preferences</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Set your default yield strategy preferences
                    </p>

                    <div className="mt-4">
                      <label htmlFor="default-strategy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Default Yield Strategy
                      </label>
                      <select
                        id="default-strategy"
                        name="default-strategy"
                        className="mt-1 input-stripe"
                        defaultValue="balanced"
                      >
                        <option value="conservative">Conservative (3.5% APY)</option>
                        <option value="balanced">Balanced (5.2% APY)</option>
                        <option value="aggressive">Aggressive (8.1% APY)</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="risk-tolerance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Risk Tolerance
                      </label>
                      <select
                        id="risk-tolerance"
                        name="risk-tolerance"
                        className="mt-1 input-stripe"
                        defaultValue="medium"
                      >
                        <option value="low">Low - Prioritize capital preservation</option>
                        <option value="medium">Medium - Balance risk and return</option>
                        <option value="high">High - Maximize returns</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              )}

              {activeTab === 'kyc' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">KYC Verification</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Complete KYC verification to unlock all platform features
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          Verification Status: {getKycStatusBadge(user?.kycStatus)}
                        </h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {user?.kycStatus === 'APPROVED'
                            ? 'Your identity has been verified. You have full access to all platform features.'
                            : user?.kycStatus === 'PENDING'
                            ? 'Your verification is being processed. This usually takes 1-2 business days.'
                            : user?.kycStatus === 'REJECTED'
                            ? 'Your verification was rejected. Please review the requirements and try again.'
                            : 'Complete the verification process to unlock all platform features.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user?.kycStatus !== 'APPROVED' && user?.kycStatus !== 'PENDING' && (
                    <div className="space-y-6">
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Identity Verification</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Upload a government-issued ID for verification
                        </p>

                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              ID Type
                            </label>
                            <select className="mt-1 input-stripe">
                              <option>Passport</option>
                              <option>Driver's License</option>
                              <option>National ID Card</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Front of ID
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md">
                              <div className="space-y-1 text-center">
                                <svg
                                  className="mx-auto h-12 w-12 text-gray-400"
                                  stroke="currentColor"
                                  fill="none"
                                  viewBox="0 0 48 48"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                  <label
                                    htmlFor="front-id-upload"
                                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                  >
                                    <span>Upload a file</span>
                                    <input id="front-id-upload" name="front-id-upload" type="file" className="sr-only" />
                                  </label>
                                  <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  PNG, JPG, GIF up to 10MB
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Back of ID
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md">
                              <div className="space-y-1 text-center">
                                <svg
                                  className="mx-auto h-12 w-12 text-gray-400"
                                  stroke="currentColor"
                                  fill="none"
                                  viewBox="0 0 48 48"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                  <label
                                    htmlFor="back-id-upload"
                                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                  >
                                    <span>Upload a file</span>
                                    <input id="back-id-upload" name="back-id-upload" type="file" className="sr-only" />
                                  </label>
                                  <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  PNG, JPG, GIF up to 10MB
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selfie Verification</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Upload a selfie holding your ID for verification
                        </p>

                        <div className="mt-4">
                          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                                aria-hidden="true"
                              >
                                <path
                                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label
                                  htmlFor="selfie-upload"
                                  className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                >
                                  <span>Upload a file</span>
                                  <input id="selfie-upload" name="selfie-upload" type="file" className="sr-only" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, GIF up to 10MB
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button>Submit Verification</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}