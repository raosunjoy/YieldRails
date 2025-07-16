/**
 * Basic usage examples for YieldRails SDK
 */

import { YieldRailsSDK, TokenSymbol, ChainName, PaymentStatus } from '@yieldrails/sdk';

// Initialize the SDK
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key', // Optional for public endpoints
  timeout: 30000,
  debug: false,
});

async function basicUsageExamples() {
  try {
    // 1. Authentication
    console.log('=== Authentication Examples ===');
    
    // Login with email/password
    const authResponse = await sdk.auth.login({
      email: 'user@example.com',
      password: 'your-password',
    });
    console.log('Logged in user:', authResponse.user.email);

    // Check authentication status
    console.log('Is authenticated:', sdk.isAuthenticated());

    // 2. Payment Creation and Management
    console.log('\n=== Payment Examples ===');
    
    // Create a payment with yield enabled
    const payment = await sdk.payments.createPayment({
      merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      amount: '100.00',
      token: TokenSymbol.USDC,
      chain: ChainName.ethereum,
      customerEmail: 'customer@example.com',
      yieldEnabled: true,
      metadata: {
        orderId: 'order-123',
        productName: 'Premium Service',
      },
    });
    console.log('Payment created:', payment.id);
    console.log('Estimated yield:', payment.estimatedYield);

    // Get payment details
    const paymentDetails = await sdk.payments.getPayment(payment.id);
    console.log('Payment status:', paymentDetails.status);

    // Get payment history
    const history = await sdk.payments.getPaymentHistory({
      limit: 10,
      status: PaymentStatus.COMPLETED,
    });
    console.log('Total payments:', history.total);

    // 3. Yield Management
    console.log('\n=== Yield Examples ===');
    
    // Get available yield strategies
    const strategies = await sdk.yield.getStrategies();
    console.log('Available strategies:');
    strategies.forEach(strategy => {
      console.log(`- ${strategy.name}: ${strategy.expectedAPY}% APY (${strategy.riskLevel} risk)`);
    });

    // Optimize yield allocation
    const optimization = await sdk.yield.optimizeYield({
      amount: '1000.00',
      token: TokenSymbol.USDC,
      chain: ChainName.ethereum,
      riskTolerance: 'MEDIUM',
      duration: 30,
    });
    console.log('Recommended strategy:', optimization.recommendedStrategy.name);
    console.log('Estimated APY:', optimization.estimatedAPY);

    // Get yield earnings
    const earnings = await sdk.yield.getEarnings({
      limit: 5,
      status: 'ACTIVE',
    });
    console.log('Active earnings:', earnings.data.length);

    // 4. Cross-Chain Operations
    console.log('\n=== Cross-Chain Examples ===');
    
    // Get bridge estimate
    const estimate = await sdk.crosschain.getBridgeEstimate(
      ChainName.ethereum,
      ChainName.polygon,
      TokenSymbol.USDC,
      '500.00'
    );
    console.log('Bridge fee:', estimate.fee);
    console.log('Estimated duration:', estimate.estimatedDuration, 'seconds');

    // Initiate bridge transaction
    const bridgeTransaction = await sdk.crosschain.initiateBridge({
      recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      amount: '500.00',
      token: TokenSymbol.USDC,
      sourceChain: ChainName.ethereum,
      destinationChain: ChainName.polygon,
    });
    console.log('Bridge transaction ID:', bridgeTransaction.id);

    // 5. Real-Time Updates
    console.log('\n=== WebSocket Examples ===');
    
    // Initialize WebSocket
    const wsClient = sdk.initializeWebSocket({
      reconnect: true,
      maxReconnectAttempts: 5,
    });

    // Set up event listeners
    wsClient.on('payment:created', (data) => {
      console.log('New payment created:', data.paymentId);
    });

    wsClient.on('yield:earned', (data) => {
      console.log('Yield earned:', data.amount, 'for payment:', data.paymentId);
    });

    // Connect to WebSocket
    await sdk.connectWebSocket();
    console.log('WebSocket connected');

    // Subscribe to specific payment updates
    wsClient.subscribeToPayment(payment.id);

    // 6. Analytics and Reporting
    console.log('\n=== Analytics Examples ===');
    
    // Get payment analytics
    const analytics = await sdk.payments.getPaymentAnalytics(
      '2023-01-01',
      '2023-12-31'
    );
    console.log('Total volume:', analytics.totalVolume);
    console.log('Completion rate:', analytics.completionRate);
    console.log('Total yield generated:', analytics.totalYieldGenerated);

    // Get yield performance metrics
    const yieldMetrics = await sdk.yield.getPerformanceMetrics(
      '2023-01-01',
      '2023-12-31'
    );
    console.log('Total earned:', yieldMetrics.totalEarned);
    console.log('Average APY:', yieldMetrics.averageAPY);

    // 7. Utility Functions
    console.log('\n=== Utility Examples ===');
    
    // Validate payment request
    const validation = sdk.validatePaymentRequest({
      merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      amount: '100.00',
      token: TokenSymbol.USDC,
      chain: ChainName.ethereum,
    });
    console.log('Payment validation:', validation.valid ? 'Valid' : 'Invalid');
    if (!validation.valid) {
      console.log('Errors:', validation.errors);
    }

    // Get dashboard data
    const dashboardData = await sdk.getDashboardData('month');
    console.log('Dashboard summary:', dashboardData.summary);

    // Estimate yield for potential payment
    const yieldEstimate = await sdk.estimateYieldForPayment('1000', 'USDC', 30);
    console.log('Yield estimates:');
    yieldEstimate.forEach(estimate => {
      console.log(`- ${estimate.strategy}: ${estimate.estimatedYield} (${estimate.expectedAPY}% APY)`);
    });

    // Health check
    const health = await sdk.healthCheck();
    console.log('System health:', {
      api: health.api ? 'OK' : 'Down',
      websocket: health.websocket ? 'Connected' : 'Disconnected',
      authenticated: health.authenticated,
    });

  } catch (error) {
    console.error('Error in examples:', error);
  } finally {
    // Clean up
    sdk.disconnectWebSocket();
    await sdk.logout();
  }
}

// Run examples
if (require.main === module) {
  basicUsageExamples().catch(console.error);
}

export { basicUsageExamples };