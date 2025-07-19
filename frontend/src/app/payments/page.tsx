'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentHistory } from '@/components/payments/PaymentHistory';
import { PaymentDetailsModal } from '@/components/payments/PaymentDetailsModal';
import { useStore } from '@/store/useStore';

export default function PaymentsPage() {
  const router = useRouter();
  const { payments, fetchPayments, isLoadingPayments } = useStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleCreatePayment = () => {
    setShowCreateForm(true);
  };

  const handlePaymentSubmit = () => {
    setShowCreateForm(false);
    fetchPayments();
  };

  const handlePaymentCancel = () => {
    setShowCreateForm(false);
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPayment(null);
  };

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Payments</h1>
            <Button onClick={handleCreatePayment}>Create Payment</Button>
          </div>

          <div className="mt-6">
            {showCreateForm ? (
              <Card title="Create New Payment" className="mb-6">
                <PaymentForm onSubmit={handlePaymentSubmit} onCancel={handlePaymentCancel} />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card title="Payment History" className="h-full">
                    <PaymentHistory
                      payments={payments}
                      isLoading={isLoadingPayments}
                      onViewDetails={handleViewDetails}
                    />
                  </Card>
                </div>
                <div>
                  <Card title="Payment Analytics">
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payments</h3>
                        <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                          {payments.length}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Volume</h3>
                        <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                          ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Yield Generated</h3>
                        <p className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-400">
                          ${payments.reduce((sum, p) => sum + (p.yieldAmount || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status Breakdown</h3>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Completed</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {payments.filter(p => p.status === 'COMPLETED').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Pending</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {payments.filter(p => p.status === 'PENDING').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Failed</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {payments.filter(p => p.status === 'FAILED').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal payment={selectedPayment} onClose={handleCloseDetailsModal} />
      )}
    </MainLayout>
  );
}