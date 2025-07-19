import { device, expect, element, by, waitFor } from 'detox';

describe('Wallet Integration', () => {
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

  describe('Wallet Connection', () => {
    beforeEach(async () => {
      await element(by.id('wallet-tab')).tap();
      await waitFor(element(by.id('wallet-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display available wallets', async () => {
      await element(by.id('connect-wallet-button')).tap();
      
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('wallet-metamask'))).toBeVisible();
      await expect(element(by.id('wallet-walletconnect'))).toBeVisible();
      await expect(element(by.id('wallet-coinbase'))).toBeVisible();
    });

    it('should connect MetaMask wallet', async () => {
      await element(by.id('connect-wallet-button')).tap();
      
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('wallet-metamask')).tap();
      
      // Mock wallet connection success
      await waitFor(element(by.text('Wallet connected successfully')))
        .toBeVisible()
        .withTimeout(15000);
      
      await waitFor(element(by.id('wallet-connected-container')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('wallet-address'))).toBeVisible();
      await expect(element(by.id('wallet-balance'))).toBeVisible();
    });

    it('should handle wallet connection failure', async () => {
      await element(by.id('connect-wallet-button')).tap();
      
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Simulate connection failure by closing modal
      await element(by.id('wallet-modal-close')).tap();
      
      await waitFor(element(by.text('Wallet connection cancelled')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should connect via WalletConnect', async () => {
      await element(by.id('connect-wallet-button')).tap();
      
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('wallet-walletconnect')).tap();
      
      await waitFor(element(by.id('qr-code-container')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('qr-code'))).toBeVisible();
      await expect(element(by.text('Scan with your wallet'))).toBeVisible();
      
      // Mock successful connection
      await waitFor(element(by.text('Wallet connected successfully')))
        .toBeVisible()
        .withTimeout(20000);
    });
  });

  describe('Connected Wallet Management', () => {
    beforeEach(async () => {
      await element(by.id('wallet-tab')).tap();
      await waitFor(element(by.id('wallet-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Connect wallet first
      await element(by.id('connect-wallet-button')).tap();
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('wallet-metamask')).tap();
      
      await waitFor(element(by.id('wallet-connected-container')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should display wallet information', async () => {
      await expect(element(by.id('wallet-address'))).toBeVisible();
      await expect(element(by.id('wallet-balance'))).toBeVisible();
      await expect(element(by.id('wallet-network'))).toBeVisible();
      await expect(element(by.id('wallet-connector'))).toBeVisible();
    });

    it('should refresh wallet balance', async () => {
      await element(by.id('refresh-balance-button')).tap();
      
      await waitFor(element(by.id('balance-loading')))
        .toBeVisible()
        .withTimeout(2000);
      
      await waitFor(element(by.text('Balance updated')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should switch networks', async () => {
      await element(by.id('network-switcher')).tap();
      
      await waitFor(element(by.id('network-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('network-polygon')).tap();
      
      await waitFor(element(by.text('Network switched successfully')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.text('Polygon'))).toBeVisible();
    });

    it('should copy wallet address', async () => {
      await element(by.id('copy-address-button')).tap();
      
      await waitFor(element(by.text('Address copied to clipboard')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should disconnect wallet', async () => {
      await element(by.id('wallet-menu-button')).tap();
      
      await waitFor(element(by.id('wallet-menu')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('disconnect-wallet')).tap();
      
      await waitFor(element(by.text('Are you sure you want to disconnect?')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Disconnect')).tap();
      
      await waitFor(element(by.text('Wallet disconnected')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('connect-wallet-button'))).toBeVisible();
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      await element(by.id('wallet-tab')).tap();
      await waitFor(element(by.id('wallet-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Connect wallet first
      await element(by.id('connect-wallet-button')).tap();
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('wallet-metamask')).tap();
      
      await waitFor(element(by.id('wallet-connected-container')))
        .toBeVisible()
        .withTimeout(15000);
      
      await element(by.id('tokens-tab')).tap();
    });

    it('should display token balances', async () => {
      await waitFor(element(by.id('token-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('token-ETH'))).toBeVisible();
      await expect(element(by.id('token-USDC'))).toBeVisible();
      await expect(element(by.id('token-USDT'))).toBeVisible();
    });

    it('should refresh token balances', async () => {
      await element(by.id('refresh-tokens-button')).tap();
      
      await waitFor(element(by.id('tokens-loading')))
        .toBeVisible()
        .withTimeout(2000);
      
      await waitFor(element(by.text('Token balances updated')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should add custom token', async () => {
      await element(by.id('add-token-button')).tap();
      
      await waitFor(element(by.id('add-token-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('token-address-input')).typeText('0xA0b86a33E6441E0de27d73C8b8C5F9d57Ea0c0E4');
      await element(by.id('add-token-submit')).tap();
      
      await waitFor(element(by.text('Token added successfully')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.id('token-list'))).toBeVisible();
    });

    it('should hide/show tokens', async () => {
      await element(by.id('token-ETH')).longPress();
      
      await waitFor(element(by.id('token-menu')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('hide-token')).tap();
      
      await waitFor(element(by.text('Token hidden')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify token is no longer visible
      await expect(element(by.id('token-ETH'))).not.toBeVisible();
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      await element(by.id('wallet-tab')).tap();
      await waitFor(element(by.id('wallet-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Connect wallet first
      await element(by.id('connect-wallet-button')).tap();
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('wallet-metamask')).tap();
      
      await waitFor(element(by.id('wallet-connected-container')))
        .toBeVisible()
        .withTimeout(15000);
      
      await element(by.id('transactions-tab')).tap();
    });

    it('should display transaction history', async () => {
      await waitFor(element(by.id('transaction-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('transaction-item-0'))).toBeVisible();
    });

    it('should filter transactions by type', async () => {
      await element(by.id('filter-button')).tap();
      
      await waitFor(element(by.id('filter-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('transaction-type-send')).tap();
      await element(by.id('apply-filter')).tap();
      
      await waitFor(element(by.id('transaction-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should view transaction details', async () => {
      await element(by.id('transaction-item-0')).tap();
      
      await waitFor(element(by.id('transaction-details-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('transaction-hash'))).toBeVisible();
      await expect(element(by.id('transaction-amount'))).toBeVisible();
      await expect(element(by.id('transaction-status'))).toBeVisible();
      await expect(element(by.id('gas-fee'))).toBeVisible();
    });

    it('should open transaction in explorer', async () => {
      await element(by.id('transaction-item-0')).tap();
      
      await waitFor(element(by.id('transaction-details-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('view-in-explorer')).tap();
      
      // Verify browser/external app opens (implementation depends on platform)
      await waitFor(element(by.text('Opening in browser')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Wallet Security', () => {
    beforeEach(async () => {
      await element(by.id('wallet-tab')).tap();
      await waitFor(element(by.id('wallet-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Connect wallet first
      await element(by.id('connect-wallet-button')).tap();
      await waitFor(element(by.id('wallet-modal')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('wallet-metamask')).tap();
      
      await waitFor(element(by.id('wallet-connected-container')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should require authentication for sensitive operations', async () => {
      await element(by.id('wallet-menu-button')).tap();
      await element(by.id('wallet-settings')).tap();
      
      await waitFor(element(by.id('authentication-prompt')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Enter PIN or use biometric
      for (let i = 0; i < global.testData.validUser.pin.length; i++) {
        await element(by.id(`pin-key-${global.testData.validUser.pin[i]}`)).tap();
      }
      
      await waitFor(element(by.id('wallet-settings-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should auto-lock wallet after inactivity', async () => {
      // Simulate app going to background
      await device.sendToHome();
      await device.launchApp();
      
      // Navigate to wallet
      await element(by.id('wallet-tab')).tap();
      
      await waitFor(element(by.id('authentication-prompt')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Authenticate to access wallet'))).toBeVisible();
    });
  });
});