# YieldRails SDK Documentation

The YieldRails SDK provides a comprehensive TypeScript/JavaScript interface for interacting with the YieldRails platform. It includes support for payments, yield optimization, cross-chain bridging, compliance, and real-time updates.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Payment Management](#payment-management)
- [Yield Optimization](#yield-optimization)
- [Cross-Chain Bridging](#cross-chain-bridging)
- [Compliance](#compliance)
- [Real-time Updates](#real-time-updates)
- [Blockchain Integration](#blockchain-integration)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Installation

```bash
npm install @yieldrails/sdk
# or
yarn add @yieldrails/sdk
```

## Quick Start

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize the SDK
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  environment: 'production', // or 'staging', 'development'
});

// Authenticate user
await sdk.auth.login({
  email: 'user@example.com',
  password: 'password123',
});

// Create a payment
const payment = await sdk.payments.createPayment({
  amount: '100.00',
  token: 'USDC',
  chain: 'ethereum',
  merchantAddress: '0x1234...',
  yieldStrategy: 'noble-tbill',
});

console.log('Payment created:', payment.id);
```

## Authentication

### Email/Password Authentication

```typescript
// Register new user
const user = await sdk.auth.register({
  email: 'user@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
});

// Login
const authResult = await sdk.auth.login({
  email: 'user@example.com',
  password: 'securePassword123',
});

console.log('Access token:', authResult.accessToken);
```

### Wallet Authentication

```typescript
// Login with wallet signature
const authResult = await sdk.auth.loginWithWallet({
  address: '0x742d35Cc662c69A7eD2259',
  signature: '0x...',
  message: 'Sign this message to authenticate',
});
```

### Session Management

```typescript
// Check if authenticated
if (sdk.isAuthenticated()) {
  console.log('User is authenticated');
}

// Enable automatic token refresh
sdk.enableAutoTokenRefresh();

// Restore session from stored tokens
sdk.restoreSession(accessToken, refreshToken, expiresIn);

// Logout
await sdk.logout();
```

## Payment Management

### Creating Payments

```typescript
// Create a payment with yield optimization
const payment = await sdk.payments.createPayment({
  amount: '250.50',
  token: 'USDC',
  chain: 'polygon',
  merchantAddress: '0x742d35Cc662c69A7eD225929BBf93',
  yieldStrategy: 'aave-lending',
  metadata: {
    orderId: 'ORDER-12345',
    description: 'Product purchase',
  },
});

// Create payment with validation
const validatedPayment = await sdk.createPaymentWithValidation({
  amount: '100.00',
  token: 'USDC',
  chain: 'arbitrum',
  merchantAddress: '0x742d35Cc662c69A7eD225929BBf93',
});
```

### Managing Payments

```typescript
// Get payment details
const payment = await sdk.payments.getPayment('payment-id-123');

// Get payment with yield information
const paymentWithYield = await sdk.getPaymentWithYield('payment-id-123');

// Release payment to merchant
await sdk.payments.releasePayment('payment-id-123');

// Cancel pending payment
await sdk.payments.cancelPayment('payment-id-123');
```

### Payment History and Analytics

```typescript
// Get payment history with filters
const history = await sdk.payments.getPaymentHistory({
  limit: 20,
  offset: 0,
  status: 'completed',
  fromDate: '2025-01-01',
  toDate: '2025-07-19',
});

// Get payment analytics
const analytics = await sdk.payments.getPaymentAnalytics(
  '2025-01-01',
  '2025-07-19'
);

console.log('Total volume:', analytics.totalVolume);
console.log('Completion rate:', analytics.completionRate);
```

## Yield Optimization

### Yield Strategies

```typescript
// Get available yield strategies
const strategies = await sdk.yield.getStrategies();

strategies.forEach(strategy => {
  console.log(`${strategy.name}: ${strategy.expectedAPY}% APY`);
});

// Get strategy details
const strategy = await sdk.yield.getStrategy('noble-tbill');
```

### Yield Calculations

```typescript
// Calculate yield for amount and duration
const yieldCalc = await sdk.yield.calculateYield(
  '1000.00', // amount
  'aave-lending', // strategy
  30 // duration in days
);

console.log('Expected yield:', yieldCalc.estimatedYield);

// Estimate yield for potential payment
const estimates = await sdk.estimateYieldForPayment(
  '500.00', // amount
  'USDC', // token
  45 // duration
);

estimates.forEach(estimate => {
  console.log(`${estimate.strategy}: ${estimate.estimatedYield} USDC`);
});
```

### Yield Optimization

```typescript
// Optimize yield allocation
const optimization = await sdk.yield.optimizeYield({
  amount: '10000.00',
  riskTolerance: 'medium',
  duration: 90,
  constraints: {
    maxSingleStrategy: 0.4, // 40% max in single strategy
    minLiquidity: 0.2, // 20% in liquid strategies
  },
});

console.log('Recommended allocation:', optimization.allocation);
```

### Yield Earnings

```typescript
// Get user's yield earnings
const earnings = await sdk.yield.getEarnings({
  limit: 50,
  strategy: 'noble-tbill',
});

// Get yield performance metrics
const metrics = await sdk.yield.getPerformanceMetrics(
  '2025-01-01',
  '2025-07-19'
);

console.log('Average APY:', metrics.averageAPY);
console.log('Total earnings:', metrics.totalEarnings);
```

## Cross-Chain Bridging

### Bridge Transactions

```typescript
// Estimate bridge cost and time
const estimate = await sdk.crosschain.getBridgeEstimate(
  'ethereum',
  'polygon',
  '100.00',
  'USDC'
);

console.log('Bridge fee:', estimate.fee);
console.log('Estimated time:', estimate.estimatedTime);

// Initiate bridge transaction
const bridgeTx = await sdk.crosschain.initiateBridge({
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
  destinationAddress: '0x742d35Cc662c69A7eD225929BBf93',
  amount: '100.00',
  token: 'USDC',
});

console.log('Bridge transaction ID:', bridgeTx.transactionId);
```

### Bridge Monitoring

```typescript
// Get bridge transaction status
const status = await sdk.crosschain.getBridgeTransactionStatus(
  'bridge-tx-123'
);

console.log('Status:', status.status);
console.log('Progress:', status.progress);

// Get transaction history
const history = await sdk.crosschain.getBridgeTransactionHistory(
  'bridge-tx-123'
);

// Subscribe to real-time updates
await sdk.crosschain.subscribeToTransactionUpdates(
  'bridge-tx-123',
  'subscriber-id-456'
);
```

### Liquidity and Analytics

```typescript
// Check liquidity availability
const liquidity = await sdk.crosschain.checkLiquidityAvailability(
  'ethereum',
  'arbitrum',
  '1000.00',
  'USDC'
);

console.log('Available liquidity:', liquidity.available);

// Get bridge analytics
const analytics = await sdk.crosschain.getBridgeAnalytics('week');
console.log('Total volume:', analytics.totalVolume);
```

## Compliance

### KYC Management

```typescript
// Submit KYC documents
const kycResult = await sdk.compliance.submitKYC({
  userId: 'user-123',
  documentType: 'passport',
  documentNumber: 'AB123456',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
  address: '123 Main St, New York, NY',
});

// Check KYC status
const kycStatus = await sdk.compliance.getKYCStatus('user-123');
console.log('KYC status:', kycStatus.status);
```

### Address and Transaction Verification

```typescript
// Check address compliance
const addressCheck = await sdk.compliance.checkAddress(
  '0x742d35Cc662c69A7eD225929BBf93'
);

console.log('Risk level:', addressCheck.riskLevel);
console.log('Is compliant:', addressCheck.isCompliant);

// Verify transaction
const txVerification = await sdk.compliance.verifyTransaction({
  transactionId: 'tx-123',
  fromAddress: '0x...',
  toAddress: '0x...',
  amount: 100.50,
  currency: 'USDC',
});

console.log('Transaction status:', txVerification.status);
```

### Risk Assessment

```typescript
// Assess risk for address
const riskAssessment = await sdk.compliance.assessRisk({
  address: '0x742d35Cc662c69A7eD225929BBf93',
  transactionCount: 150,
  totalVolume: 50000,
});

console.log('Risk score:', riskAssessment.combinedRiskScore);

// Check sanctions
const sanctionsCheck = await sdk.compliance.checkSanctions({
  name: 'John Doe',
  address: '0x742d35Cc662c69A7eD225929BBf93',
});

console.log('Sanctions match:', sanctionsCheck.isMatch);
```

## Real-time Updates

### WebSocket Connection

```typescript
// Initialize WebSocket
const wsClient = sdk.initializeWebSocket({
  reconnect: true,
  maxReconnectAttempts: 5,
});

// Connect with authentication
await sdk.connectWebSocket();

// Listen for payment events
wsClient.on('payment:created', (data) => {
  console.log('New payment created:', data.paymentId);
});

wsClient.on('payment:confirmed', (data) => {
  console.log('Payment confirmed:', data.paymentId);
  console.log('Transaction hash:', data.transactionHash);
});

// Listen for yield events
wsClient.on('yield:earned', (data) => {
  console.log('Yield earned:', data.amount);
});

// Listen for bridge events
wsClient.on('bridge:completed', (data) => {
  console.log('Bridge completed:', data.transactionId);
  console.log('Yield during transit:', data.yieldEarned);
});
```

### Event Subscriptions

```typescript
// Subscribe to specific payment
wsClient.subscribeToPayment('payment-123');

// Subscribe to yield updates
wsClient.subscribeToYield();

// Subscribe to bridge transaction
wsClient.subscribeToBridge('bridge-tx-456');

// Unsubscribe
wsClient.unsubscribeFromPayment('payment-123');
```

## Blockchain Integration

### Contract Initialization

```typescript
import { ethers } from 'ethers';

// Connect to wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize contracts for a chain
const contracts = await sdk.initializeContractsForChain(
  'ethereum',
  {
    yieldEscrow: YieldEscrowABI,
    yieldVault: YieldVaultABI,
    crossChainBridge: CrossChainBridgeABI,
  },
  signer
);
```

### Direct Blockchain Interactions

```typescript
// Create payment directly on blockchain
const tx = await sdk.createOnChainPayment(
  'ethereum',
  '0x742d35Cc662c69A7eD225929BBf93', // merchant
  '100000000', // amount (in wei/smallest unit)
  '0xA0b86a33E6441e37C5ff2dD0fa2b44eb25Bf5c8b', // token address
  'noble-tbill' // strategy
);

// Wait for confirmation
const receipt = await tx.wait();
console.log('Transaction confirmed:', receipt.hash);

// Get on-chain payment details
const onChainPayment = await sdk.getOnChainPayment('ethereum', 'deposit-123');
console.log('Yield generated:', onChainPayment.yieldGenerated);

// Get real-time yield
const currentYield = await sdk.getRealtimeYield('ethereum', 'deposit-123');
console.log('Current yield:', currentYield);
```

### Event Listening

```typescript
// Subscribe to blockchain events
sdk.subscribeToBlockchainEvents(
  'ethereum',
  'deposits',
  (event) => {
    console.log('New deposit created:', event.args.depositId);
  },
  '0x742d35Cc662c69A7eD225929BBf93' // filter by user address
);

// Subscribe to yield events
sdk.subscribeToBlockchainEvents(
  'ethereum',
  'yields',
  (event) => {
    console.log('Yield earned:', event.args.amount);
  }
);

// Unsubscribe from events
sdk.unsubscribeFromBlockchainEvents('ethereum');
```

## Error Handling

```typescript
import { YieldRailsError } from '@yieldrails/sdk';

try {
  const payment = await sdk.payments.createPayment({
    amount: '100.00',
    token: 'INVALID_TOKEN',
    chain: 'ethereum',
    merchantAddress: '0x...',
  });
} catch (error) {
  if (error instanceof YieldRailsError) {
    console.error('YieldRails error:', error.message);
    console.error('Error code:', error.code);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

### Complete Payment Flow

```typescript
async function completePaymentFlow() {
  // 1. Initialize SDK and authenticate
  const sdk = new YieldRailsSDK({
    apiUrl: 'https://api.yieldrails.com',
  });

  await sdk.auth.login({
    email: 'user@example.com',
    password: 'password123',
  });

  // 2. Get yield estimates
  const estimates = await sdk.estimateYieldForPayment('100.00', 'USDC', 30);
  const bestStrategy = estimates.reduce((best, current) => 
    parseFloat(current.estimatedYield) > parseFloat(best.estimatedYield) ? current : best
  );

  // 3. Create payment with best strategy
  const payment = await sdk.payments.createPayment({
    amount: '100.00',
    token: 'USDC',
    chain: 'ethereum',
    merchantAddress: '0x742d35Cc662c69A7eD225929BBf93',
    yieldStrategy: bestStrategy.strategyId,
  });

  // 4. Monitor payment progress
  const wsClient = sdk.initializeWebSocket();
  await sdk.connectWebSocket();

  wsClient.on('payment:confirmed', (data) => {
    if (data.paymentId === payment.id) {
      console.log('Payment confirmed on blockchain');
    }
  });

  wsClient.on('yield:earned', (data) => {
    if (data.paymentId === payment.id) {
      console.log(`Yield earned: ${data.amount} USDC`);
    }
  });

  return payment;
}
```

### Cross-Chain Payment with Bridge

```typescript
async function crossChainPayment() {
  const sdk = new YieldRailsSDK({
    apiUrl: 'https://api.yieldrails.com',
  });

  // 1. Check bridge estimate
  const estimate = await sdk.crosschain.getBridgeEstimate(
    'ethereum',
    'polygon',
    '500.00',
    'USDC'
  );

  console.log(`Bridge fee: ${estimate.fee} USDC`);
  console.log(`Estimated time: ${estimate.estimatedTime} minutes`);

  // 2. Initiate bridge
  const bridgeTx = await sdk.crosschain.initiateBridge({
    sourceChain: 'ethereum',
    destinationChain: 'polygon',
    destinationAddress: '0x742d35Cc662c69A7eD225929BBf93',
    amount: '500.00',
    token: 'USDC',
  });

  // 3. Monitor bridge progress
  const wsClient = sdk.initializeWebSocket();
  await sdk.connectWebSocket();

  wsClient.subscribeToBridge(bridgeTx.transactionId);

  wsClient.on('bridge:completed', (data) => {
    console.log('Bridge completed!');
    console.log(`Yield earned during transit: ${data.yieldEarned} USDC`);
  });

  return bridgeTx;
}
```

### Dashboard Data Aggregation

```typescript
async function getDashboardData() {
  const sdk = new YieldRailsSDK({
    apiUrl: 'https://api.yieldrails.com',
  });

  // Get comprehensive dashboard data
  const dashboard = await sdk.getDashboardData('month');

  console.log('Dashboard Summary:');
  console.log(`Total Volume: $${dashboard.summary.totalVolume}`);
  console.log(`Total Yield: $${dashboard.summary.totalYield}`);
  console.log(`Completion Rate: ${dashboard.summary.completionRate}%`);
  console.log(`Average APY: ${dashboard.summary.averageAPY}%`);

  // Display recent payments
  console.log('\nRecent Payments:');
  dashboard.recentPayments.forEach(payment => {
    console.log(`${payment.id}: $${payment.amount} ${payment.token}`);
  });

  return dashboard;
}
```

For more examples and advanced usage, see our [GitHub repository](https://github.com/yieldrails/sdk) and [API documentation](https://docs.yieldrails.com/api).