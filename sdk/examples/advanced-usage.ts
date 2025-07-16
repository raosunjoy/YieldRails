/**
 * Advanced usage examples for YieldRails SDK
 */

import { YieldRailsSDK, TokenSymbol, ChainName, PaymentStatus, YieldRailsError } from '@yieldrails/sdk';

// Initialize SDK with advanced configuration
const sdk = new YieldRailsSDK({
  apiUrl: process.env.YIELDRAILS_API_URL || 'https://api.yieldrails.com',
  apiKey: process.env.YIELDRAILS_API_KEY,
  timeout: 60000,
  debug: process.env.NODE_ENV === 'development',
});

async function advancedUsageExamples() {
  try {
    // 1. Advanced Authentication Patterns
    console.log('=== Advanced Authentication ===');
    
    // Register new user with wallet signature
    const registerResponse = await sdk.auth.register({
      email: 'newuser@example.com',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      signature: 'signature-from-wallet',
      message: 'Register with YieldRails',
      firstName: 'John',
      lastName: 'Doe',
    });
    console.log('User registered:', registerResponse.user.id);

    // Enable automatic token refresh
    sdk.enableAutoTokenRefresh();

    // Create API key for programmatic access
    const apiKey = await sdk.auth.createApiKey({
      name: 'Production API Key',
      permissions: ['payments:read', 'payments:write', 'yield:read'],
    });
    console.log('API key created:', apiKey.keyId);

    // 2. Batch Payment Operations
    console.log('\n=== Batch Payment Operations ===');
    
    // Create multiple payments in parallel
    const paymentRequests = [
      {
        merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '100.00',
        token: TokenSymbol.USDC,
        chain: ChainName.ethereum,
        yieldEnabled: true,
      },
      {
        merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '250.00',
        token: TokenSymbol.USDC,
        chain: ChainName.polygon,
        yieldEnabled: true,
      },
      {
        merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDT,
        chain: ChainName.arbitrum,
        yieldEnabled: true,
      },
    ];

    const payments = await Promise.all(
      paymentRequests.map(request => sdk.payments.createPayment(request))
    );
    console.log('Created payments:', payments.map(p => p.id));

    // Get multiple payments in batch
    const paymentIds = payments.map(p => p.id);
    const batchResults = await sdk.getPaymentsBatch(paymentIds);
    console.log('Batch results:', {
      successful: batchResults.successful.length,
      failed: batchResults.failed.length,
    });

    // 3. Advanced Yield Strategies
    console.log('\n=== Advanced Yield Strategies ===');
    
    // Compare multiple yield strategies
    const strategies = await sdk.yield.getStrategies();
    const activeStrategies = strategies.filter(s => s.isActive).slice(0, 3);
    
    const comparison = await sdk.yield.compareStrategies(
      activeStrategies.map(s => s.id),
      '10000.00',
      90 // 90 days
    );
    
    console.log('Strategy comparison:');
    comparison.forEach(result => {
      console.log(`- ${result.strategy.name}: ${result.estimatedYield} yield (${result.estimatedAPY}% APY)`);
    });

    // Get real-time yield rates
    const currentRates = await sdk.yield.getCurrentRates();
    console.log('Current yield rates:');
    currentRates.forEach(rate => {
      console.log(`- ${rate.name}: ${rate.currentAPY}% APY (${rate.change24h} 24h change)`);
    });

    // 4. Cross-Chain Liquidity Management
    console.log('\n=== Cross-Chain Liquidity Management ===');
    
    // Check liquidity across multiple chains
    const chains = [ChainName.ethereum, ChainName.polygon, ChainName.arbitrum];
    const liquidityChecks = await Promise.all(
      chains.map(chain => 
        sdk.crosschain.checkLiquidity(chain, TokenSymbol.USDC, '1000.00')
      )
    );
    
    console.log('Liquidity availability:');
    liquidityChecks.forEach((liquidity, index) => {
      console.log(`- ${chains[index]}: ${liquidity.availableLiquidity} USDC (${liquidity.utilizationRate}% utilized)`);
    });

    // Get supported bridge routes
    const routes = await sdk.crosschain.getSupportedRoutes();
    console.log('Available bridge routes:', routes.length);

    // 5. Advanced WebSocket Usage
    console.log('\n=== Advanced WebSocket Usage ===');
    
    const wsClient = sdk.initializeWebSocket({
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectInterval: 3000,
    });

    // Set up comprehensive event handling
    const eventHandlers = {
      'payment:created': (data: any) => console.log('Payment created:', data.paymentId),
      'payment:confirmed': (data: any) => console.log('Payment confirmed:', data.paymentId),
      'payment:released': (data: any) => console.log('Payment released:', data.paymentId, 'Yield:', data.yieldEarned),
      'yield:earned': (data: any) => console.log('Yield earned:', data.amount, 'Strategy:', data.strategy),
      'yield:optimized': (data: any) => console.log('Yield optimized:', data.newStrategy),
      'bridge:initiated': (data: any) => console.log('Bridge initiated:', data.transactionId),
      'bridge:completed': (data: any) => console.log('Bridge completed:', data.transactionId),
      'connected': () => console.log('WebSocket connected'),
      'disconnected': () => console.log('WebSocket disconnected'),
      'error': (error: Error) => console.error('WebSocket error:', error.message),
    };

    // Register all event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      wsClient.on(event as any, handler);
    });

    await sdk.connectWebSocket();

    // Subscribe to multiple event types
    wsClient.subscribeToYield();
    payments.forEach(payment => wsClient.subscribeToPayment(payment.id));

    // 6. Error Handling and Retry Logic
    console.log('\n=== Error Handling Examples ===');
    
    // Implement retry logic for failed operations
    async function retryOperation<T>(
      operation: () => Promise<T>,
      maxRetries: number = 3,
      delay: number = 1000
    ): Promise<T> {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          if (attempt === maxRetries) throw error;
          
          if (error instanceof YieldRailsError) {
            console.log(`Attempt ${attempt} failed: ${error.code} - ${error.message}`);
            
            // Don't retry certain error types
            if (error.statusCode === 400 || error.statusCode === 401) {
              throw error;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
      throw new Error('Max retries exceeded');
    }

    // Example: Retry payment creation with exponential backoff
    try {
      const retryPayment = await retryOperation(
        () => sdk.payments.createPayment({
          merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
          amount: '100.00',
          token: TokenSymbol.USDC,
          chain: ChainName.ethereum,
        }),
        3,
        1000
      );
      console.log('Payment created with retry:', retryPayment.id);
    } catch (error) {
      console.error('Payment creation failed after retries:', error);
    }

    // 7. Performance Monitoring and Analytics
    console.log('\n=== Performance Monitoring ===');
    
    // Monitor API performance
    const startTime = Date.now();
    const performanceTest = await sdk.payments.getPaymentHistory({ limit: 100 });
    const endTime = Date.now();
    console.log(`API call took ${endTime - startTime}ms for ${performanceTest.total} payments`);

    // Get comprehensive analytics
    const [paymentAnalytics, yieldMetrics, bridgeAnalytics] = await Promise.all([
      sdk.payments.getPaymentAnalytics('2023-01-01', '2023-12-31'),
      sdk.yield.getPerformanceMetrics('2023-01-01', '2023-12-31'),
      sdk.crosschain.getBridgeAnalytics('2023-01-01', '2023-12-31'),
    ]);

    console.log('Comprehensive analytics:', {
      payments: {
        totalVolume: paymentAnalytics.totalVolume,
        completionRate: paymentAnalytics.completionRate,
      },
      yield: {
        totalEarned: yieldMetrics.totalEarned,
        averageAPY: yieldMetrics.averageAPY,
      },
      bridge: {
        totalTransactions: bridgeAnalytics.totalTransactions,
        successRate: bridgeAnalytics.completedTransactions / bridgeAnalytics.totalTransactions,
      },
    });

    // 8. Custom Configuration and Middleware
    console.log('\n=== Custom Configuration ===');
    
    // Update SDK configuration dynamically
    sdk.updateConfig({
      timeout: 120000, // Increase timeout for heavy operations
      debug: true,
    });

    // Get current configuration
    const config = sdk.getConfig();
    console.log('Current config:', {
      apiUrl: config.apiUrl,
      timeout: config.timeout,
      debug: config.debug,
    });

    // 9. Integration Testing Helpers
    console.log('\n=== Integration Testing Helpers ===');
    
    // Health check with detailed status
    const healthStatus = await sdk.healthCheck();
    console.log('System health check:', healthStatus);

    // Validate system capabilities
    const supportedChains = sdk.getSupportedChains();
    const supportedTokens = sdk.getSupportedTokens();
    console.log('System capabilities:', {
      chains: supportedChains.length,
      tokens: supportedTokens.length,
    });

    // Test payment limits
    const limits = await sdk.payments.getPaymentLimits();
    console.log('Payment limits:', limits);

    // 10. Cleanup and Resource Management
    console.log('\n=== Cleanup ===');
    
    // Graceful shutdown
    setTimeout(() => {
      console.log('Performing graceful shutdown...');
      sdk.disconnectWebSocket();
    }, 5000);

  } catch (error) {
    if (error instanceof YieldRailsError) {
      console.error('YieldRails API Error:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Utility function for handling WebSocket events with type safety
function createTypedEventHandler<T>(handler: (data: T) => void) {
  return handler;
}

// Example of typed event handlers
const typedHandlers = {
  paymentCreated: createTypedEventHandler<{ paymentId: string; amount: string }>((data) => {
    console.log(`Payment ${data.paymentId} created for ${data.amount}`);
  }),
  
  yieldEarned: createTypedEventHandler<{ paymentId: string; amount: string; strategy: string }>((data) => {
    console.log(`Earned ${data.amount} yield from ${data.strategy} for payment ${data.paymentId}`);
  }),
};

// Run advanced examples
if (require.main === module) {
  advancedUsageExamples().catch(console.error);
}

export { advancedUsageExamples, createTypedEventHandler };