# YieldRails SDK API Reference

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Authentication](#authentication)
- [Payment Management](#payment-management)
- [Yield Management](#yield-management)
- [Cross-Chain Operations](#cross-chain-operations)
- [Compliance](#compliance)
- [WebSocket Real-Time Updates](#websocket-real-time-updates)
- [Blockchain Interactions](#blockchain-interactions)
- [Error Handling](#error-handling)
- [Utility Methods](#utility-methods)

## Installation

```bash
npm install @yieldrails/sdk
```

## Initialization

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key', // Optional for public endpoints
  timeout: 30000, // Request timeout in ms
  retries: 3, // Number of retries for failed requests
  debug: false, // Enable debug logging
});
```

## Authentication

### Login with Email/Password

```typescript
const authResponse = await sdk.auth.login({
  email: 'user@example.com',
  password: 'your-password',
});

console.log('Access token:', authResponse.accessToken);
console.log('User:', authResponse.user);
```

### Login with Wallet Signature

```typescript
const authResponse = await sdk.auth.login({
  walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  signature: 'signature-from-wallet',
  message: 'Sign this message to authenticate',
});
```

### Register New User

```typescript
const authResponse = await sdk.auth.register({
  email: 'newuser@example.com',
  walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  signature: 'signature-from-wallet',
  message: 'Register with YieldRails',
  firstName: 'John',
  lastName: 'Doe',
});
```

### Check Authentication Status

```typescript
if (sdk.isAuthenticated()) {
  console.log('User is authenticated');
}
```

### Enable Automatic Token Refresh

```typescript
sdk.enableAutoTokenRefresh();
```

### Restore Session

```typescript
sdk.restoreSession(accessToken, refreshToken, expiresIn);
```

### Logout

```typescript
await sdk.logout();
```

## Payment Management

### Create Payment

```typescript
const payment = await sdk.payments.createPayment({
  merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  amount: '100.00',
  token: 'USDC',
  chain: 'ethereum',
  customerEmail: 'customer@example.com',
  yieldEnabled: true,
  metadata: {
    orderId: 'order-123',
    productName: 'Premium Service',
  },
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
});
```

### Get Payment Details

```typescript
const payment = await sdk.payments.getPayment('payment-id');
console.log('Payment status:', payment.status);
console.log('Estimated yield:', payment.estimatedYield);
```

### Get Payment History

```typescript
const history = await sdk.payments.getPaymentHistory({
  limit: 10,
  offset: 0,
  status: 'COMPLETED',
  fromDate: '2023-01-01',
  toDate: '2023-12-31',
});

console.log('Total payments:', history.total);
console.log('Payments:', history.payments);
```

### Confirm Payment

```typescript
const confirmedPayment = await sdk.payments.confirmPayment(
  'payment-id',
  '0xabc123...' // transaction hash
);
```

### Release Payment

```typescript
const releasedPayment = await sdk.payments.releasePayment('payment-id');
console.log('Actual yield earned:', releasedPayment.actualYield);
```

### Get Payment Analytics

```typescript
const analytics = await sdk.payments.getPaymentAnalytics(
  '2023-01-01', // fromDate
  '2023-12-31', // toDate
  'merchant-id' // optional merchant filter
);

console.log('Total volume:', analytics.totalVolume);
console.log('Completion rate:', analytics.completionRate);
console.log('Total yield generated:', analytics.totalYieldGenerated);
```

## Yield Management

### Get Available Strategies

```typescript
const strategies = await sdk.yield.getStrategies();

strategies.forEach(strategy => {
  console.log(`${strategy.name}: ${strategy.expectedAPY}% APY`);
  console.log(`Risk level: ${strategy.riskLevel}`);
  console.log(`TVL: ${strategy.totalValueLocked}`);
});
```

### Optimize Yield

```typescript
const optimization = await sdk.yield.optimizeYield({
  amount: '1000.00',
  token: 'USDC',
  chain: 'ethereum',
  riskTolerance: 'MEDIUM',
  duration: 30, // days
});

console.log('Recommended strategy:', optimization.recommendedStrategy.name);
console.log('Estimated APY:', optimization.estimatedAPY);
console.log('Estimated yield:', optimization.estimatedYield);
```

### Get Yield Earnings

```typescript
const earnings = await sdk.yield.getEarnings({
  limit: 20,
  status: 'ACTIVE',
  fromDate: '2023-01-01',
});

console.log('Total earnings:', earnings.total);
earnings.data.forEach(earning => {
  console.log(`Earning ${earning.id}: ${earning.yieldAmount} ${earning.tokenSymbol}`);
});
```

### Get Performance Metrics

```typescript
const metrics = await sdk.yield.getPerformanceMetrics(
  '2023-01-01',
  '2023-12-31'
);

console.log('Total earned:', metrics.totalEarned);
console.log('Average APY:', metrics.averageAPY);
console.log('Best performing strategy:', metrics.bestPerformingStrategy.name);
```

### Calculate Yield

```typescript
const calculation = await sdk.yield.calculateYield(
  '1000.00', // amount
  'strategy-id',
  30 // duration in days
);

console.log('Estimated yield:', calculation.estimatedYield);
console.log('Estimated APY:', calculation.estimatedAPY);

// Daily breakdown
calculation.breakdown.forEach(day => {
  console.log(`Day ${day.day}: ${day.dailyYield} (cumulative: ${day.cumulativeYield})`);
});
```

## Cross-Chain Operations

### Initiate Bridge Transaction

```typescript
const bridgeTransaction = await sdk.crosschain.initiateBridge({
  recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  amount: '500.00',
  token: 'USDC',
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
  metadata: {
    purpose: 'Cross-chain payment',
  },
});

console.log('Bridge transaction ID:', bridgeTransaction.id);
console.log('Estimated duration:', bridgeTransaction.estimatedDuration, 'seconds');
```

### Get Bridge Estimate

```typescript
const estimate = await sdk.crosschain.getBridgeEstimate(
  'ethereum',
  'polygon',
  'USDC',
  '500.00'
);

console.log('Bridge fee:', estimate.fee);
console.log('Estimated duration:', estimate.estimatedDuration, 'seconds');
console.log('Estimated yield during transit:', estimate.estimatedYield);
```

### Check Liquidity

```typescript
const liquidity = await sdk.crosschain.checkLiquidity(
  'polygon',
  'USDC',
  '1000.00'
);

console.log('Available liquidity:', liquidity.availableLiquidity);
console.log('Is available:', liquidity.isAvailable);
```

### Get Bridge History

```typescript
const history = await sdk.crosschain.getBridgeHistory({
  limit: 10,
  status: 'COMPLETED',
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
});

console.log('Bridge transactions:', history.data);
```

## Compliance

### Submit KYC Documents

```typescript
const kycSubmission = await sdk.compliance.submitKYC({
  documentType: 'PASSPORT',
  documentNumber: 'AB123456',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
  countryCode: 'US',
  documentImages: ['base64-encoded-image-front', 'base64-encoded-image-back'],
});

console.log('KYC submission ID:', kycSubmission.id);
console.log('KYC status:', kycSubmission.status);
```

### Check KYC Status

```typescript
const kycStatus = await sdk.compliance.getKYCStatus();

console.log('KYC status:', kycStatus.status);
console.log('Verification level:', kycStatus.verificationLevel);
console.log('Last updated:', kycStatus.updatedAt);
```

### Verify Transaction Compliance

```typescript
const complianceCheck = await sdk.compliance.verifyTransaction({
  sourceAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  destinationAddress: '0x123d35Cc6634C0532925a3b8D4C9db96C4b4d456',
  amount: '1000.00',
  token: 'USDC',
  chain: 'ethereum',
});

console.log('Is compliant:', complianceCheck.isCompliant);
console.log('Risk score:', complianceCheck.riskScore);
console.log('Reasons:', complianceCheck.reasons);
```

## WebSocket Real-Time Updates

### Initialize WebSocket

```typescript
// Initialize WebSocket client
const wsClient = sdk.initializeWebSocket({
  reconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 5000,
});

// Connect to WebSocket
await sdk.connectWebSocket();
```

### Subscribe to Events

```typescript
// Payment events
wsClient.on('payment:created', (data) => {
  console.log('New payment created:', data.paymentId);
});

wsClient.on('payment:confirmed', (data) => {
  console.log('Payment confirmed:', data.paymentId, data.transactionHash);
});

wsClient.on('payment:released', (data) => {
  console.log('Payment released:', data.paymentId, 'Yield earned:', data.yieldEarned);
});

// Yield events
wsClient.on('yield:earned', (data) => {
  console.log('Yield earned:', data.amount, 'for payment:', data.paymentId);
});

// Bridge events
wsClient.on('bridge:completed', (data) => {
  console.log('Bridge completed:', data.transactionId, 'Yield earned:', data.yieldEarned);
});

// Connection events
wsClient.on('connected', () => {
  console.log('WebSocket connected');
});

wsClient.on('disconnected', () => {
  console.log('WebSocket disconnected');
});
```

### Subscribe to Specific Events

```typescript
// Subscribe to specific payment
wsClient.subscribeToPayment('payment-id');

// Subscribe to yield events
wsClient.subscribeToYield();

// Subscribe to specific bridge transaction
wsClient.subscribeToBridge('bridge-transaction-id');
```

### Disconnect WebSocket

```typescript
sdk.disconnectWebSocket();
```

## Blockchain Interactions

### Initialize Contract

```typescript
// Initialize contract with ABI and address
const contract = sdk.initContract(
  'YieldEscrow', // Contract ID for reference
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9', // Contract address
  YIELD_ESCROW_ABI, // Contract ABI
  ChainName.ethereum, // Optional chain name
  signer // Optional signer
);
```

### Connect Wallet

```typescript
// Browser environment with MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await sdk.connectWallet(provider);
console.log('Connected wallet address:', await signer.getAddress());

// Node.js environment
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/your-infura-key');
const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const signer = new ethers.Wallet(privateKey, provider);
```

### Read from Contract

```typescript
// Read from contract (view/pure functions)
const balance = await sdk.blockchain.readContract<bigint>(
  'USDC', // Contract ID
  'balanceOf', // Method name
  [userAddress] // Arguments
);

console.log(`USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
```

### Write to Contract

```typescript
// Write to contract (state-changing functions)
const tx = await sdk.blockchain.writeContract(
  'YieldEscrow', // Contract ID
  'createDeposit', // Method name
  [
    amount,
    tokenAddress,
    merchantAddress,
    strategyAddress,
    paymentHash,
    metadata
  ], // Arguments
  { gasLimit: 200000 } // Optional transaction overrides
);

console.log(`Transaction hash: ${tx.hash}`);

// Get transaction explorer URL
const txUrl = sdk.getTransactionExplorerUrl(ChainName.ethereum, tx.hash);
console.log(`View transaction: ${txUrl}`);

// Wait for confirmation
const receipt = await sdk.waitForTransaction(ChainName.ethereum, tx.hash, 1);
console.log(`Confirmed in block ${receipt.blockNumber}`);
```

### Estimate Gas

```typescript
// Estimate gas for transaction
const gas = await sdk.blockchain.estimateGas(
  'YieldEscrow', // Contract ID
  'createDeposit', // Method name
  [
    amount,
    tokenAddress,
    merchantAddress,
    strategyAddress,
    paymentHash,
    metadata
  ] // Arguments
);

console.log(`Estimated gas: ${gas.toString()}`);
```

## Error Handling

```typescript
import { YieldRailsError } from '@yieldrails/sdk';

try {
  const payment = await sdk.payments.createPayment({
    merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
    amount: '100.00',
    token: 'USDC',
    chain: 'ethereum',
  });
} catch (error) {
  if (error instanceof YieldRailsError) {
    console.error('YieldRails API Error:', error.code, error.message);
    console.error('Status code:', error.statusCode);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Utility Methods

### Update Configuration

```typescript
sdk.updateConfig({
  timeout: 60000,
  debug: true,
});
```

### Get Configuration

```typescript
const config = sdk.getConfig();
console.log('API URL:', config.apiUrl);
console.log('Timeout:', config.timeout);
```

### Validate Payment Request

```typescript
const validation = sdk.validatePaymentRequest({
  merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  amount: '100.00',
  token: 'USDC',
  chain: 'ethereum',
});

if (validation.valid) {
  console.log('Payment request is valid');
} else {
  console.log('Validation errors:', validation.errors);
}
```

### Get Dashboard Data

```typescript
const dashboardData = await sdk.getDashboardData('month');

console.log('Total volume:', dashboardData.summary.totalVolume);
console.log('Total yield:', dashboardData.summary.totalYield);
console.log('Average APY:', dashboardData.summary.averageAPY);
```

### Estimate Yield for Payment

```typescript
const yieldEstimates = await sdk.estimateYieldForPayment(
  '1000.00', // amount
  'USDC', // token
  30 // duration in days
);

yieldEstimates.forEach(estimate => {
  console.log(`${estimate.strategy}: ${estimate.estimatedYield} (${estimate.expectedAPY}% APY)`);
});
```

### Health Check

```typescript
const health = await sdk.healthCheck();

console.log('API status:', health.api ? 'OK' : 'Down');
console.log('WebSocket status:', health.websocket ? 'Connected' : 'Disconnected');
console.log('Authenticated:', health.authenticated);
```

### Get SDK Version

```typescript
const version = sdk.getVersion();
console.log('SDK version:', version);
```

### Get Supported Chains

```typescript
const chains = sdk.getSupportedChains();
console.log('Supported chains:', chains);
```

### Get Supported Tokens

```typescript
const tokens = sdk.getSupportedTokens();
console.log('Supported tokens:', tokens);
```