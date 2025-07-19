import { device, expect, element, by, waitFor } from 'detox';

describe('Payment Management', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    
    // Login first
    await element(by.id('email-input')).typeText(global.testData.validUser.email);
    await element(by.id('password-input')).typeText(global.testData.validUser.password);
    await element(by.id('login-button')).tap();
    
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });

  describe('Payment Creation', () => {
    beforeEach(async () => {
      await element(by.id('payments-tab')).tap();
      await waitFor(element(by.id('payments-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('create-payment-button')).tap();
      await waitFor(element(by.id('create-payment-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should create a standard payment successfully', async () => {
      await element(by.id('amount-input')).typeText(global.testData.validPayment.amount);
      await element(by.id('currency-picker')).tap();
      await element(by.text(global.testData.validPayment.currency)).tap();
      await element(by.id('recipient-input')).typeText(global.testData.validPayment.recipient);
      await element(by.id('memo-input')).typeText('Test payment via E2E');
      
      await element(by.id('create-payment-submit')).tap();
      
      await waitFor(element(by.text('Payment created successfully')))
        .toBeVisible()
        .withTimeout(10000);
      
      await waitFor(element(by.id('payments-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should validate payment amount', async () => {
      await element(by.id('amount-input')).typeText('0');
      await element(by.id('create-payment-submit')).tap();
      
      await waitFor(element(by.text('Amount must be greater than 0')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should validate recipient address', async () => {
      await element(by.id('amount-input')).typeText('100');
      await element(by.id('recipient-input')).typeText('invalid-address');
      await element(by.id('create-payment-submit')).tap();
      
      await waitFor(element(by.text('Invalid recipient address')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should create cross-chain payment', async () => {
      await element(by.id('payment-type-picker')).tap();
      await element(by.text('Cross-chain')).tap();
      
      await element(by.id('source-chain-picker')).tap();
      await element(by.text('Ethereum')).tap();
      
      await element(by.id('target-chain-picker')).tap();
      await element(by.text('Polygon')).tap();
      
      await element(by.id('amount-input')).typeText('100');
      await element(by.id('currency-picker')).tap();
      await element(by.text('USDC')).tap();
      await element(by.id('recipient-input')).typeText(global.testData.validPayment.recipient);
      
      await element(by.id('estimate-fees-button')).tap();
      
      await waitFor(element(by.id('fee-estimate-container')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('create-payment-submit')).tap();
      
      await waitFor(element(by.text('Cross-chain payment created successfully')))
        .toBeVisible()
        .withTimeout(15000);
    });
  });

  describe('Payment History', () => {
    beforeEach(async () => {
      await element(by.id('payments-tab')).tap();
      await waitFor(element(by.id('payments-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display payment history', async () => {
      await waitFor(element(by.id('payment-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('payment-item-0'))).toBeVisible();
    });

    it('should filter payments by status', async () => {
      await element(by.id('filter-button')).tap();
      await waitFor(element(by.id('filter-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('status-filter-completed')).tap();
      await element(by.id('apply-filter-button')).tap();
      
      await waitFor(element(by.id('payment-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify filtered results
      await expect(element(by.id('payment-item-0'))).toBeVisible();
    });

    it('should search payments', async () => {
      await element(by.id('search-input')).typeText('100');
      
      await waitFor(element(by.id('payment-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify search results contain the amount
      await expect(element(by.text('100.00'))).toBeVisible();
    });

    it('should view payment details', async () => {
      await element(by.id('payment-item-0')).tap();
      
      await waitFor(element(by.id('payment-details-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('payment-amount'))).toBeVisible();
      await expect(element(by.id('payment-status'))).toBeVisible();
      await expect(element(by.id('payment-recipient'))).toBeVisible();
      await expect(element(by.id('transaction-hash'))).toBeVisible();
    });
  });

  describe('Payment Actions', () => {
    beforeEach(async () => {
      await element(by.id('payments-tab')).tap();
      await waitFor(element(by.id('payments-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should cancel pending payment', async () => {
      // Find a pending payment
      await element(by.id('payment-item-pending')).tap();
      
      await waitFor(element(by.id('payment-details-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('cancel-payment-button')).tap();
      
      await waitFor(element(by.text('Are you sure you want to cancel this payment?')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Cancel Payment')).tap();
      
      await waitFor(element(by.text('Payment cancelled successfully')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should retry failed payment', async () => {
      // Find a failed payment
      await element(by.id('payment-item-failed')).tap();
      
      await waitFor(element(by.id('payment-details-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('retry-payment-button')).tap();
      
      await waitFor(element(by.text('Payment retry initiated')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should share payment receipt', async () => {
      await element(by.id('payment-item-0')).tap();
      
      await waitFor(element(by.id('payment-details-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('share-receipt-button')).tap();
      
      // Verify share modal appears (implementation depends on platform)
      await waitFor(element(by.text('Share Receipt')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Payment Statistics', () => {
    beforeEach(async () => {
      await element(by.id('payments-tab')).tap();
      await waitFor(element(by.id('payments-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('stats-tab')).tap();
    });

    it('should display payment statistics', async () => {
      await waitFor(element(by.id('stats-container')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('total-payments'))).toBeVisible();
      await expect(element(by.id('total-volume'))).toBeVisible();
      await expect(element(by.id('success-rate'))).toBeVisible();
      await expect(element(by.id('average-amount'))).toBeVisible();
    });

    it('should filter statistics by date range', async () => {
      await element(by.id('date-range-picker')).tap();
      
      await waitFor(element(by.id('date-picker-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('last-30-days')).tap();
      await element(by.id('apply-date-range')).tap();
      
      await waitFor(element(by.id('stats-container')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify stats updated for the selected period
      await expect(element(by.text('Last 30 days'))).toBeVisible();
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      await element(by.id('payments-tab')).tap();
      await waitFor(element(by.id('payments-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should select multiple payments', async () => {
      await element(by.id('select-mode-button')).tap();
      
      await element(by.id('payment-checkbox-0')).tap();
      await element(by.id('payment-checkbox-1')).tap();
      
      await expect(element(by.text('2 selected'))).toBeVisible();
    });

    it('should export selected payments', async () => {
      await element(by.id('select-mode-button')).tap();
      await element(by.id('payment-checkbox-0')).tap();
      await element(by.id('payment-checkbox-1')).tap();
      
      await element(by.id('export-selected-button')).tap();
      
      await waitFor(element(by.text('Export format')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('CSV')).tap();
      
      await waitFor(element(by.text('Export completed')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});