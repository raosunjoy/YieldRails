# Quick Start Guide

Get up and running with YieldRails in just 5 minutes! This guide will walk you through creating your first yield-generating payment using the YieldRails SDK.

## Prerequisites

- Node.js 16+ or modern browser environment
- Basic knowledge of JavaScript/TypeScript
- An Ethereum wallet (for blockchain interactions)

## Step 1: Installation

Install the YieldRails SDK using npm or yarn:

```bash
npm install @yieldrails/sdk
# or
yarn add @yieldrails/sdk
```

## Step 2: Get API Credentials

1. Visit the [YieldRails Developer Portal](https://developers.yieldrails.com)
2. Create an account or sign in
3. Generate your API key
4. Copy your API key for use in your application

## Step 3: Initialize the SDK

Create a new JavaScript/TypeScript file and initialize the SDK:

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize the SDK
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com', // Use staging URL for testing
  apiKey: 'your-api-key-here',
});

console.log('YieldRails SDK initialized successfully!');
```

## Step 4: Create Your First Payment

Let's create a yield-generating payment that will earn interest while it's held in escrow:

```typescript
async function createYieldPayment() {
  try {
    // First, let's see what yield strategies are available
    const strategies = await sdk.yield.getStrategies();
    console.log('Available yield strategies:', strategies);

    // Choose a strategy (let's pick the first one with low risk)
    const lowRiskStrategy = strategies.find(s => s.riskLevel === 'low');
    if (!lowRiskStrategy) {
      throw new Error('No low-risk strategies available');
    }

    // Create a payment
    const payment = await sdk.payments.create({
      amount: '1000.00',           // $1,000 USDC
      token: 'USDC',               // Using USDC stablecoin
      recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8', // Replace with actual address
      yieldStrategy: lowRiskStrategy.id,
      sourceChain: 1,              // Ethereum mainnet
      destinationChain: 137,       // Polygon
      memo: 'My first YieldRails payment',
    });

    console.log('Payment created successfully!');
    console.log('Payment ID:', payment.id);
    console.log('Estimated yield:', payment.estimatedYield);
    console.log('Status:', payment.status);

    return payment;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

// Execute the function
createYieldPayment();
```

## Step 5: Monitor Payment Status

Add real-time monitoring to track your payment:

```typescript
async function monitorPayment(paymentId: string) {
  try {
    // Get current payment details
    const payment = await sdk.payments.getDetails(paymentId);
    console.log('Current payment status:', payment.status);
    console.log('Current yield earned:', payment.actualYield || '0');

    // Initialize WebSocket for real-time updates
    await sdk.initializeWebSocket({
      autoReconnect: true,
      heartbeat: true,
    });

    // Subscribe to payment updates
    sdk.payments.subscribe(paymentId, (update) => {
      console.log('Payment update received:', {
        status: update.status,
        yieldEarned: update.actualYield,
        timestamp: new Date().toISOString(),
      });

      // Check if payment is ready to be released
      if (update.status === 'yielding') {
        console.log('Payment is generating yield! 💰');
      }
    });

    console.log('Monitoring started. Updates will appear above...');
  } catch (error) {
    console.error('Error monitoring payment:', error);
  }
}
```

## Step 6: Complete Example

Here's a complete example that puts it all together:

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize SDK
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: process.env.YIELDRAILS_API_KEY, // Store in environment variables
});

async function quickStartExample() {
  try {
    console.log('🚀 Starting YieldRails Quick Start Example\n');

    // Step 1: Get available yield strategies
    console.log('📊 Fetching available yield strategies...');
    const strategies = await sdk.yield.getStrategies();
    
    console.log(`Found ${strategies.length} strategies:`);
    strategies.forEach((strategy, index) => {
      console.log(`  ${index + 1}. ${strategy.name} - ${strategy.actualAPY}% APY (${strategy.riskLevel} risk)`);
    });

    // Step 2: Choose optimal strategy
    const optimalStrategy = strategies
      .filter(s => s.riskLevel === 'low')
      .sort((a, b) => b.actualAPY - a.actualAPY)[0];

    if (!optimalStrategy) {
      throw new Error('No suitable strategies found');
    }

    console.log(`\n✅ Selected strategy: ${optimalStrategy.name} (${optimalStrategy.actualAPY}% APY)\n`);

    // Step 3: Create payment
    console.log('💳 Creating yield-generating payment...');
    const payment = await sdk.payments.create({
      amount: '500.00',
      token: 'USDC',
      recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
      yieldStrategy: optimalStrategy.id,
      sourceChain: 1,
      destinationChain: 137,
      memo: 'YieldRails Quick Start Payment',
    });

    console.log('✅ Payment created successfully!');
    console.log(`   Payment ID: ${payment.id}`);
    console.log(`   Amount: ${payment.amount} ${payment.token}`);
    console.log(`   Estimated yield: ${payment.estimatedYield}`);
    console.log(`   Status: ${payment.status}`);

    // Step 4: Set up real-time monitoring
    console.log('\n📡 Setting up real-time monitoring...');
    await sdk.initializeWebSocket();

    sdk.payments.subscribe(payment.id, (update) => {
      console.log(`📈 Payment Update: Status=${update.status}, Yield=${update.actualYield || '0'}`);
    });

    // Step 5: Demonstrate yield optimization
    console.log('\n🎯 Getting personalized yield optimization...');
    const optimization = await sdk.yield.optimize({
      amount: '500.00',
      riskTolerance: 'moderate',
      timeHorizon: 30,
    });

    console.log('💡 Optimization recommendations:');
    console.log(`   Best strategy: ${optimization.recommendedStrategy.name}`);
    console.log(`   Projected monthly return: ${optimization.projectedReturns.monthly}`);
    console.log(`   Risk score: ${optimization.riskAnalysis.volatility}`);

    console.log('\n🎉 Quick Start completed successfully!');
    console.log('💰 Your payment is now generating yield while it processes.');
    console.log('\nNext steps:');
    console.log('  - Check out the developer guide for more features');
    console.log('  - Explore cross-chain bridge capabilities');
    console.log('  - Learn about external DeFi protocol integrations');

  } catch (error) {
    console.error('❌ Quick Start failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
  }
}

// Run the example
quickStartExample();
```

## Step 7: Environment Setup

Create a `.env` file for your environment variables:

```bash
# .env file
YIELDRAILS_API_KEY=your-api-key-here
YIELDRAILS_API_URL=https://api.yieldrails.com

# For development/testing
# YIELDRAILS_API_URL=https://staging-api.yieldrails.com
```

## Step 8: Error Handling

Add proper error handling for production use:

```typescript
import { YieldRailsError } from '@yieldrails/sdk';

async function createPaymentWithErrorHandling() {
  try {
    const payment = await sdk.payments.create({
      // ... payment parameters
    });
    return payment;
  } catch (error) {
    if (error instanceof YieldRailsError) {
      // Handle specific YieldRails errors
      switch (error.code) {
        case 'INSUFFICIENT_BALANCE':
          console.error('Insufficient balance for payment');
          break;
        case 'INVALID_YIELD_STRATEGY':
          console.error('Selected yield strategy is not available');
          break;
        case 'UNSUPPORTED_CHAIN':
          console.error('Chain not supported for this operation');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          console.error('Rate limit exceeded, please try again later');
          break;
        default:
          console.error('YieldRails error:', error.message);
      }
    } else {
      // Handle general errors
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

## Next Steps

🎉 Congratulations! You've successfully created your first yield-generating payment with YieldRails.

### Learn More

- **[Payment Integration Guide](./payment-integration.md)** - Deep dive into payment features
- **[Yield Optimization](./yield-optimization.md)** - Advanced yield strategies
- **[Cross-chain Bridge](./cross-chain-integration.md)** - Multi-chain transactions
- **[External Services](./external-services.md)** - DeFi protocol integrations
- **[Smart Contracts](./smart-contracts.md)** - Direct blockchain interaction

### Explore Examples

- **[React Payment Interface](../examples/react-payment-app/)** - Complete React application
- **[Cross-chain Wallet](../examples/cross-chain-wallet/)** - Multi-chain wallet implementation
- **[Yield Dashboard](../examples/yield-dashboard/)** - Yield optimization dashboard

### Get Help

- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions
- **[FAQ](./faq.md)** - Frequently asked questions
- **[Discord Community](https://discord.gg/yieldrails)** - Chat with other developers
- **[GitHub Discussions](https://github.com/raosunjoy/YieldRails/discussions)** - Technical discussions

### Production Checklist

Before deploying to production:

- [ ] Store API keys securely in environment variables
- [ ] Implement comprehensive error handling
- [ ] Set up proper logging and monitoring
- [ ] Test with small amounts first
- [ ] Review [security best practices](./best-practices.md)
- [ ] Configure [rate limiting](./rate-limiting.md) appropriately

---

Ready to build something amazing? Start with the [Payment Integration Guide](./payment-integration.md) to learn about advanced payment features!