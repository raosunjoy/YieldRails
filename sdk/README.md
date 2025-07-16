# YieldRails SDK

The official TypeScript SDK for YieldRails - a yield-powered cross-border payment infrastructure.

## Features

- 🚀 **Easy Integration** - Simple, intuitive API for payment creation and management
- 🔐 **Secure Authentication** - JWT-based auth with automatic token refresh
- 💰 **Yield Optimization** - Built-in yield strategies and optimization algorithms
- 🌐 **Cross-Chain Support** - Seamless payments across multiple blockchain networks
- 📡 **Real-Time Updates** - WebSocket support for live payment and yield notifications
- 📊 **Analytics & Reporting** - Comprehensive payment and yield analytics
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive type definitions
- ✅ **100% Test Coverage** - Thoroughly tested and reliable

## Installation

```bash
npm install @yieldrails/sdk
```

## Quick Start

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize the SDK
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key', // Optional for public endpoints
  timeout: 30000,
  debug: false,
});

// Authenticate (optional for API key usage)
await sdk.auth.login({
  email: 'user@example.com',
  password: 'your-password',
});

// Create a payment
const payment = await sdk.payments.createPayment({
  merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  amount: '100.00',
  token: 'USDC',
  chain: 'ethereum',
  yieldEnabled: true,
});

console.log('Payment created:', payment.id);
```

## Authentication

### Email/Password Login

```typescript
const authResponse = await sdk.auth.login({
  email: 'user@example.com',
  password: 'your-password',
});

console.log('Access token:', authResponse.accessToken);
console.log('User:', authResponse.user);
```

### Wallet Signature Login

```typescript
const authResponse = await sdk.auth.login({
  walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  signature: 'signature-from-wallet',
  message: 'Sign this message to authenticate',
});
```

### User Registration

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

### Session Management

```typescript
// Check authentication status
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

### Payment History

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

### Payment Analytics

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

### Performance Metrics

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

### Bridge History

```typescript
const history = await sdk.crosschain.getBridgeHistory({
  limit: 10,
  status: 'COMPLETED',
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
});

console.log('Bridge transactions:', history.data);
```

## Real-Time Updates

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

## Configuration

### SDK Configuration

```typescript
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key', // Optional
  timeout: 30000, // Request timeout in ms
  retries: 3, // Number of retries for failed requests
  debug: true, // Enable debug logging
});

// Update configuration
sdk.updateConfig({
  timeout: 60000,
  debug: false,
});
```

### WebSocket Configuration

```typescript
const wsClient = sdk.initializeWebSocket({
  url: 'wss://api.yieldrails.com/ws', // Auto-generated from API URL
  reconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 5000,
});
```

## Health Check

```typescript
const health = await sdk.healthCheck();

console.log('API status:', health.api ? 'OK' : 'Down');
console.log('WebSocket status:', health.websocket ? 'Connected' : 'Disconnected');
console.log('Authenticated:', health.authenticated);
console.log('Timestamp:', health.timestamp);
```

## Advanced Usage

### Custom API Client

```typescript
import { ApiClient } from '@yieldrails/sdk';

const apiClient = new ApiClient({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key',
  timeout: 30000,
});

// Use directly
const response = await apiClient.get('/api/custom-endpoint');
```

### Batch Operations

```typescript
// Get multiple payments
const paymentIds = ['payment-1', 'payment-2', 'payment-3'];
const payments = await Promise.all(
  paymentIds.map(id => sdk.payments.getPayment(id))
);

// Process multiple yield optimizations
const optimizations = await Promise.all([
  sdk.yield.optimizeYield({ amount: '100', token: 'USDC', chain: 'ethereum', riskTolerance: 'LOW' }),
  sdk.yield.optimizeYield({ amount: '500', token: 'USDC', chain: 'polygon', riskTolerance: 'MEDIUM' }),
  sdk.yield.optimizeYield({ amount: '1000', token: 'USDC', chain: 'arbitrum', riskTolerance: 'HIGH' }),
]);
```

## TypeScript Support

The SDK is built with TypeScript and provides comprehensive type definitions:

```typescript
import {
  Payment,
  PaymentStatus,
  YieldStrategy,
  BridgeTransaction,
  ChainName,
  TokenSymbol,
} from '@yieldrails/sdk';

// Type-safe payment creation
const payment: Payment = await sdk.payments.createPayment({
  merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  amount: '100.00',
  token: TokenSymbol.USDC,
  chain: ChainName.ethereum,
});

// Type-safe status checking
if (payment.status === PaymentStatus.COMPLETED) {
  console.log('Payment completed with yield:', payment.actualYield);
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@yieldrails.com
- 💬 Discord: [YieldRails Community](https://discord.gg/yieldrails)
- 📖 Documentation: [docs.yieldrails.com](https://docs.yieldrails.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yieldrails/sdk/issues)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.