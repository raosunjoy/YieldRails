# Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues when working with the YieldRails platform.

## 📋 Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Authentication Issues](#authentication-issues)
- [Payment Creation Problems](#payment-creation-problems)
- [Yield Strategy Issues](#yield-strategy-issues)
- [Cross-Chain Bridge Problems](#cross-chain-bridge-problems)
- [External Service Integration Issues](#external-service-integration-issues)
- [SDK and API Issues](#sdk-and-api-issues)
- [Smart Contract Interactions](#smart-contract-interactions)
- [Performance and Rate Limiting](#performance-and-rate-limiting)
- [Error Code Reference](#error-code-reference)
- [Common Questions (FAQ)](#common-questions-faq)

## Quick Diagnostics

### System Health Check

Before troubleshooting specific issues, perform a basic system health check:

```bash
# Check API status
curl https://api.yieldrails.com/api/health

# Check detailed service health
curl https://api.yieldrails.com/api/health/detailed
```

### SDK Health Check

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key'
});

// Basic connectivity test
try {
  const health = await sdk.getHealth();
  console.log('API Status:', health.status);
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

### Network Connectivity

```bash
# Test API connectivity
ping api.yieldrails.com

# Test specific endpoint
curl -I https://api.yieldrails.com/api/health

# Check DNS resolution
nslookup api.yieldrails.com
```

## Authentication Issues

### Issue: "Invalid API Key" Error

**Symptoms:**
- `401 Unauthorized` responses
- Error message: "Invalid or missing API key"

**Solutions:**

1. **Verify API Key Format:**
```typescript
// Correct format
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'yr_live_abc123def456ghi789' // Starts with 'yr_live_' or 'yr_test_'
});
```

2. **Check Environment Variables:**
```bash
# Verify environment variable is set
echo $YIELDRAILS_API_KEY

# Check for hidden characters
echo "$YIELDRAILS_API_KEY" | cat -A
```

3. **Validate API Key Status:**
```bash
# Test API key directly
curl -H "Authorization: Bearer your-api-key" \
     https://api.yieldrails.com/api/auth/profile
```

### Issue: "JWT Token Expired" Error

**Symptoms:**
- `401 Unauthorized` after successful authentication
- Error code: `AUTH_TOKEN_EXPIRED`

**Solutions:**

1. **Implement Token Refresh:**
```typescript
try {
  const result = await sdk.payments.create(paymentData);
} catch (error) {
  if (error.code === 'AUTH_TOKEN_EXPIRED') {
    // Refresh token
    await sdk.auth.refreshToken(refreshToken);
    // Retry request
    const result = await sdk.payments.create(paymentData);
  }
}
```

2. **Check Token Expiration:**
```typescript
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
```

### Issue: "Insufficient Permissions" Error

**Symptoms:**
- `403 Forbidden` responses
- Error code: `AUTH_INSUFFICIENT_PERMISSIONS`

**Solutions:**

1. **Check User Type:**
```typescript
const profile = await sdk.auth.getProfile();
console.log('User type:', profile.userType);

// Merchant-only endpoints require userType: 'merchant'
if (profile.userType !== 'merchant') {
  console.error('Merchant account required for this operation');
}
```

2. **Verify KYC Status:**
```typescript
if (profile.kycStatus !== 'approved') {
  console.error('KYC approval required for this operation');
  // Redirect to KYC flow
}
```

## Payment Creation Problems

### Issue: "Insufficient Balance" Error

**Symptoms:**
- Payment creation fails
- Error code: `PAYMENT_INSUFFICIENT_BALANCE`

**Solutions:**

1. **Check Wallet Balance:**
```typescript
// Check user's token balance
const balance = await sdk.payments.getTokenBalance('USDC');
console.log('USDC Balance:', balance);

if (parseFloat(balance) < parseFloat(paymentAmount)) {
  console.error('Insufficient balance for payment');
}
```

2. **Account for Fees:**
```typescript
// Include fees in balance check
const estimate = await sdk.crosschain.estimate({
  amount: '1000.00',
  token: 'USDC',
  sourceChain: 1,
  destinationChain: 137
});

const totalRequired = parseFloat(paymentAmount) + parseFloat(estimate.fees.totalFee);
console.log('Total required:', totalRequired);
```

### Issue: "Invalid Yield Strategy" Error

**Symptoms:**
- Payment creation fails
- Error code: `PAYMENT_INVALID_STRATEGY`

**Solutions:**

1. **Verify Strategy Availability:**
```typescript
const strategies = await sdk.yield.getStrategies();
const validStrategy = strategies.find(s => s.id === 'your-strategy-id');

if (!validStrategy) {
  console.error('Strategy not found');
} else if (!validStrategy.isActive) {
  console.error('Strategy is currently inactive');
}
```

2. **Check Strategy Constraints:**
```typescript
const strategy = await sdk.yield.getStrategy('noble-tbill-3m');

if (parseFloat(paymentAmount) < parseFloat(strategy.minAmount)) {
  console.error(`Minimum amount: ${strategy.minAmount}`);
}

if (strategy.maxAmount && parseFloat(paymentAmount) > parseFloat(strategy.maxAmount)) {
  console.error(`Maximum amount: ${strategy.maxAmount}`);
}
```

### Issue: "Chain Not Supported" Error

**Symptoms:**
- Payment creation fails
- Error code: `PAYMENT_CHAIN_NOT_SUPPORTED`

**Solutions:**

1. **Check Supported Chains:**
```typescript
const chains = await sdk.crosschain.getSupportedChains();
const sourceChainSupported = chains.find(c => c.chainId === sourceChain);
const destChainSupported = chains.find(c => c.chainId === destinationChain);

if (!sourceChainSupported) {
  console.error('Source chain not supported:', sourceChain);
}
if (!destChainSupported) {
  console.error('Destination chain not supported:', destinationChain);
}
```

2. **Verify Chain Status:**
```typescript
const sourceStatus = await sdk.crosschain.getChainStatus(sourceChain);
const destStatus = await sdk.crosschain.getChainStatus(destinationChain);

if (sourceStatus.status !== 'active') {
  console.error('Source chain is not active:', sourceStatus.status);
}
if (destStatus.status !== 'active') {
  console.error('Destination chain is not active:', destStatus.status);
}
```

## Yield Strategy Issues

### Issue: Low or No Yield Generation

**Symptoms:**
- Payments show minimal yield
- Yield not updating as expected

**Diagnostic Steps:**

1. **Check Strategy Performance:**
```typescript
const performance = await sdk.yield.getPerformance('your-strategy-id');
console.log('Current APY:', performance.actualAPY);
console.log('Recent performance:', performance.recentReturns);
```

2. **Monitor Real-time Yield:**
```typescript
sdk.yield.subscribeToUpdates((update) => {
  console.log('Yield update:', {
    strategy: update.strategyId,
    currentAPY: update.actualAPY,
    yieldAccrued: update.yieldAccrued
  });
});
```

3. **Check External Protocol Status:**
```typescript
const health = await sdk.external.getServiceHealth();
console.log('External services:', health.services);

// Check specific protocol
const circuitBreakers = await sdk.external.getCircuitBreakerStatus();
if (circuitBreakers.noble === 'OPEN') {
  console.warn('Noble Protocol circuit breaker is open');
}
```

### Issue: Strategy Optimization Not Working

**Symptoms:**
- Optimization returns suboptimal strategies
- Recommendations don't match expected performance

**Solutions:**

1. **Review Optimization Parameters:**
```typescript
const optimization = await sdk.yield.optimize({
  amount: '10000.00',
  riskTolerance: 'moderate', // Try different values
  timeHorizon: 30, // Adjust based on your needs
  preferredChains: [1, 137] // Limit to specific chains
});

console.log('Recommended strategy:', optimization.recommendedStrategy);
console.log('Risk analysis:', optimization.riskAnalysis);
```

2. **Compare Multiple Optimizations:**
```typescript
const conservative = await sdk.yield.optimize({
  amount: '10000.00',
  riskTolerance: 'conservative',
  timeHorizon: 30
});

const aggressive = await sdk.yield.optimize({
  amount: '10000.00',
  riskTolerance: 'aggressive',
  timeHorizon: 30
});

console.log('Conservative APY:', conservative.recommendedStrategy.actualAPY);
console.log('Aggressive APY:', aggressive.recommendedStrategy.actualAPY);
```

## Cross-Chain Bridge Problems

### Issue: Bridge Transaction Stuck

**Symptoms:**
- Bridge status remains "in_transit" for extended periods
- Transaction not completing on destination chain

**Diagnostic Steps:**

1. **Check Bridge Status:**
```typescript
const bridgeStatus = await sdk.crosschain.getTransaction(bridgeId);
console.log('Bridge status:', bridgeStatus.status);
console.log('Source tx:', bridgeStatus.sourceTransactionHash);
console.log('Destination tx:', bridgeStatus.destinationTransactionHash);
```

2. **Monitor Bridge Progress:**
```typescript
sdk.crosschain.subscribeToTransaction(bridgeId, (update) => {
  console.log('Bridge update:', {
    status: update.status,
    confirmations: update.confirmations,
    estimatedCompletion: update.estimatedCompletion
  });
});
```

3. **Check Chain Congestion:**
```typescript
const sourceChainStatus = await sdk.crosschain.getChainStatus(sourceChain);
const destChainStatus = await sdk.crosschain.getChainStatus(destinationChain);

console.log('Source chain congestion:', sourceChainStatus.congestionLevel);
console.log('Destination chain congestion:', destChainStatus.congestionLevel);
```

### Issue: High Bridge Fees

**Symptoms:**
- Bridge fees higher than expected
- Transaction becoming uneconomical

**Solutions:**

1. **Compare Different Routes:**
```typescript
// Check different chain combinations
const routes = [
  { source: 1, dest: 137 }, // Ethereum to Polygon
  { source: 1, dest: 42161 }, // Ethereum to Arbitrum
  { source: 137, dest: 42161 } // Polygon to Arbitrum
];

for (const route of routes) {
  const estimate = await sdk.crosschain.estimate({
    amount: '1000.00',
    token: 'USDC',
    sourceChain: route.source,
    destinationChain: route.dest
  });
  
  console.log(`${route.source} -> ${route.dest}: ${estimate.fees.totalFee} USDC`);
}
```

2. **Check Current Network Conditions:**
```typescript
const fees = await sdk.crosschain.getCurrentFees();
console.log('Current bridge fees:', fees);

// Wait for better conditions if fees are high
if (parseFloat(fees.averageFee) > maxAcceptableFee) {
  console.log('Waiting for lower fees...');
  // Implement retry logic
}
```

## External Service Integration Issues

### Issue: Noble Protocol Connection Failed

**Symptoms:**
- Noble pool data not loading
- T-bill strategies unavailable

**Solutions:**

1. **Check Noble Service Status:**
```typescript
const health = await sdk.external.getServiceHealth();
if (health.services.noble.status !== 'healthy') {
  console.error('Noble service is down:', health.services.noble.error);
}
```

2. **Verify Circuit Breaker Status:**
```typescript
const circuitBreakers = await sdk.external.getCircuitBreakerStatus();
if (circuitBreakers.noble === 'OPEN') {
  console.log('Noble circuit breaker is open - retrying in 5 minutes');
  // Implement exponential backoff
}
```

3. **Manual Reset (if authorized):**
```typescript
// Only for authorized users
try {
  await sdk.external.resetCircuitBreaker('noble');
  console.log('Circuit breaker reset successfully');
} catch (error) {
  console.error('Not authorized to reset circuit breaker');
}
```

### Issue: Aave Integration Problems

**Symptoms:**
- Aave lending strategies failing
- Incorrect APY data

**Solutions:**

1. **Check Aave Market Status:**
```typescript
const markets = await sdk.external.getAaveMarkets();
const ethMarket = markets.find(m => m.chainId === 1);

if (ethMarket.status !== 'ACTIVE') {
  console.error('Aave Ethereum market is not active:', ethMarket.status);
}
```

2. **Verify Asset Availability:**
```typescript
const assets = await sdk.external.getAaveMarketAssets(ethMarket.marketId);
const usdcAsset = assets.find(a => a.symbol === 'USDC');

if (!usdcAsset || !usdcAsset.isActive) {
  console.error('USDC not available in Aave market');
}
```

## SDK and API Issues

### Issue: SDK Import/Installation Problems

**Symptoms:**
- Module not found errors
- TypeScript compilation issues

**Solutions:**

1. **Verify Installation:**
```bash
# Check if package is installed
npm list @yieldrails/sdk

# Reinstall if necessary
npm uninstall @yieldrails/sdk
npm install @yieldrails/sdk@latest
```

2. **Check Import Syntax:**
```typescript
// Correct import
import { YieldRailsSDK } from '@yieldrails/sdk';

// Alternative import
const { YieldRailsSDK } = require('@yieldrails/sdk');
```

3. **TypeScript Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### Issue: Rate Limiting

**Symptoms:**
- `429 Too Many Requests` errors
- Error code: `RATE_LIMIT_EXCEEDED`

**Solutions:**

1. **Implement Exponential Backoff:**
```typescript
async function makeRequestWithBackoff(apiCall: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED' && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Usage
const payment = await makeRequestWithBackoff(() => 
  sdk.payments.create(paymentData)
);
```

2. **Batch Requests:**
```typescript
// Instead of multiple individual requests
const payments = [];
for (const data of paymentDataArray) {
  // This would hit rate limits
  // payments.push(await sdk.payments.create(data));
}

// Use batch operations when available
const batchPayments = await sdk.payments.createBatch(paymentDataArray);
```

### Issue: WebSocket Connection Problems

**Symptoms:**
- Real-time updates not working
- WebSocket connection drops

**Solutions:**

1. **Check WebSocket Configuration:**
```typescript
try {
  await sdk.initializeWebSocket({
    autoReconnect: true,
    heartbeat: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5
  });
  
  console.log('WebSocket connected successfully');
} catch (error) {
  console.error('WebSocket connection failed:', error);
}
```

2. **Monitor Connection Status:**
```typescript
sdk.on('websocket:connected', () => {
  console.log('WebSocket connected');
});

sdk.on('websocket:disconnected', () => {
  console.log('WebSocket disconnected');
});

sdk.on('websocket:error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Smart Contract Interactions

### Issue: Transaction Failures

**Symptoms:**
- Smart contract calls failing
- Gas estimation errors

**Solutions:**

1. **Check Gas Settings:**
```typescript
// Estimate gas before transaction
const gasEstimate = await sdk.blockchain.estimateGas(
  contract,
  'createPayment',
  [recipient, amount, token, strategy]
);

// Add buffer to gas estimate
const gasLimit = Math.floor(Number(gasEstimate) * 1.2);

const tx = await sdk.contracts.createOnChainPayment({
  amount: '1000000000', // 1000 USDC
  recipient,
  yieldStrategy: 'noble-tbill-3m',
  gasLimit
});
```

2. **Verify Contract Addresses:**
```typescript
const addresses = sdk.contracts.getContractAddresses(1); // Ethereum
console.log('YieldEscrow address:', addresses.yieldEscrow);

// Verify contract is deployed
const code = await provider.getCode(addresses.yieldEscrow);
if (code === '0x') {
  console.error('Contract not deployed at this address');
}
```

### Issue: Event Subscription Not Working

**Symptoms:**
- Blockchain events not firing
- Event listeners not receiving data

**Solutions:**

1. **Check Event Subscription:**
```typescript
// Correct event subscription
sdk.contracts.subscribeToDepositEvents((event) => {
  console.log('Deposit event:', event);
});

// Verify event filters
sdk.contracts.subscribeToBlockchainEvents('PaymentCreated', (event) => {
  console.log('Payment created:', event);
}, {
  fromBlock: 'latest', // Only new events
  toBlock: 'latest'
});
```

2. **Check Network Connection:**
```typescript
// Verify provider connection
const blockNumber = await sdk.blockchain.getBlockNumber();
console.log('Current block:', blockNumber);

// Test event history
const filter = {
  address: contractAddress,
  fromBlock: blockNumber - 100,
  toBlock: 'latest'
};

const logs = await provider.getLogs(filter);
console.log('Recent events:', logs.length);
```

## Performance and Rate Limiting

### Issue: Slow API Responses

**Symptoms:**
- API calls taking longer than expected
- Timeout errors

**Solutions:**

1. **Increase Timeout:**
```typescript
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key',
  timeout: 60000, // 60 seconds
  retryAttempts: 3
});
```

2. **Implement Request Caching:**
```typescript
class CachedSDK {
  private cache = new Map();
  private sdk: YieldRailsSDK;

  constructor(sdk: YieldRailsSDK) {
    this.sdk = sdk;
  }

  async getStrategiesWithCache(ttl = 60000) {
    const cacheKey = 'strategies';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const strategies = await this.sdk.yield.getStrategies();
    this.cache.set(cacheKey, {
      data: strategies,
      timestamp: Date.now()
    });

    return strategies;
  }
}
```

3. **Monitor Performance:**
```typescript
class PerformanceMonitor {
  static async timeRequest<T>(name: string, request: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await request();
      const duration = Date.now() - start;
      console.log(`${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`${name} failed after ${duration}ms:`, error.message);
      throw error;
    }
  }
}

// Usage
const strategies = await PerformanceMonitor.timeRequest(
  'Get Strategies',
  () => sdk.yield.getStrategies()
);
```

## Error Code Reference

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS`: Invalid login credentials
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `AUTH_ACCOUNT_SUSPENDED`: User account is suspended
- `AUTH_KYC_REQUIRED`: KYC verification required

### Payment Errors
- `PAYMENT_INSUFFICIENT_BALANCE`: Insufficient balance for payment
- `PAYMENT_INVALID_STRATEGY`: Invalid or unavailable yield strategy
- `PAYMENT_CHAIN_NOT_SUPPORTED`: Blockchain not supported
- `PAYMENT_AMOUNT_TOO_LOW`: Payment amount below minimum
- `PAYMENT_AMOUNT_TOO_HIGH`: Payment amount above maximum
- `PAYMENT_RECIPIENT_INVALID`: Invalid recipient address
- `PAYMENT_TOKEN_NOT_SUPPORTED`: Token not supported

### Bridge Errors
- `BRIDGE_INSUFFICIENT_LIQUIDITY`: Insufficient bridge liquidity
- `BRIDGE_CHAIN_CONGESTION`: Target chain is congested
- `BRIDGE_INVALID_ROUTE`: Invalid cross-chain route
- `BRIDGE_FEE_TOO_HIGH`: Bridge fee exceeds maximum
- `BRIDGE_TIMEOUT`: Bridge transaction timed out

### External Service Errors
- `EXTERNAL_SERVICE_UNAVAILABLE`: External service is down
- `EXTERNAL_CIRCUIT_BREAKER_OPEN`: Circuit breaker is open
- `EXTERNAL_RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `EXTERNAL_INVALID_RESPONSE`: Invalid response from external service

### General Errors
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `VALIDATION_ERROR`: Request validation failed
- `NETWORK_ERROR`: Network connectivity issue
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `MAINTENANCE_MODE`: System is in maintenance mode

## Common Questions (FAQ)

### Q: Why is my payment not generating yield?

**A:** Check the following:
1. Verify the payment status is "yielding"
2. Confirm the yield strategy is active
3. Check if sufficient time has passed (some strategies have minimum periods)
4. Verify external protocol connectivity

### Q: How long do cross-chain transfers take?

**A:** Transfer times vary by network:
- Ethereum ↔ Polygon: 15-30 minutes
- Ethereum ↔ Arbitrum: 10-20 minutes
- Polygon ↔ Arbitrum: 20-40 minutes

During high congestion, transfers may take longer.

### Q: Can I cancel a payment after creation?

**A:** Payments can only be cancelled:
- Before yield generation starts
- By the original sender
- If the payment hasn't been released

### Q: Why are bridge fees so high?

**A:** Bridge fees depend on:
- Network congestion
- Gas prices on both chains
- Bridge liquidity
- Token volatility

Consider waiting for lower congestion periods or using alternative routes.

### Q: How do I report a bug or get support?

**A:** For support:
- **Technical Issues**: [GitHub Issues](https://github.com/raosunjoy/YieldRails/issues)
- **API Support**: [api-support@yieldrails.com](mailto:api-support@yieldrails.com)
- **General Support**: [Discord Community](https://discord.gg/yieldrails)
- **Documentation**: [docs.yieldrails.com](https://docs.yieldrails.com)

### Q: Is there a test environment available?

**A:** Yes, use the staging environment:
- **API URL**: `https://staging-api.yieldrails.com`
- **Documentation**: Same endpoints with `staging-` prefix
- **Test tokens**: Available through faucets on testnets

---

If you can't find a solution to your problem in this guide, please reach out to our support team with:
1. Detailed error messages
2. Code snippets (without sensitive data)
3. Steps to reproduce the issue
4. Expected vs. actual behavior

We're here to help you succeed with YieldRails!
