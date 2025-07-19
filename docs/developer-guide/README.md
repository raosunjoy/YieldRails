# YieldRails Developer Guide

Welcome to the YieldRails Developer Guide! This comprehensive documentation will help you integrate YieldRails into your applications, whether you're building a payment interface, yield optimization tool, or cross-chain DeFi application.

## 📚 Documentation Overview

- **[Quick Start Guide](./quick-start.md)** - Get up and running in 5 minutes
- **[SDK Reference](./sdk-reference.md)** - Complete TypeScript SDK documentation
- **[API Reference](../api/openapi.yaml)** - OpenAPI specification and endpoints
- **[Authentication Guide](./authentication.md)** - JWT and wallet authentication patterns
- **[Payment Integration](./payment-integration.md)** - Creating and managing payments
- **[Yield Optimization](./yield-optimization.md)** - Accessing yield strategies and optimization
- **[Cross-Chain Bridge](./cross-chain-integration.md)** - Cross-chain payment workflows
- **[External Services](./external-services.md)** - DeFi protocol integrations
- **[Smart Contracts](./smart-contracts.md)** - Direct blockchain interaction
- **[Best Practices](./best-practices.md)** - Security and performance guidelines
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## 🚀 Quick Start

### Installation

```bash
npm install @yieldrails/sdk
```

### Basic Usage

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize the SDK
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key-here',
});

// Create a yield-generating payment
const payment = await sdk.payments.create({
  amount: '1000.00',
  token: 'USDC',
  recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  yieldStrategy: 'noble-tbill-3m',
  sourceChain: 1, // Ethereum
  destinationChain: 137, // Polygon
});

console.log('Payment created:', payment.id);
```

## 🔧 Core Features

### 💰 Payment Management
Create yield-generating payments that automatically optimize returns while funds are in escrow.

```typescript
// Create payment with yield optimization
const payment = await sdk.payments.create({
  amount: '5000.00',
  token: 'USDC',
  recipient: '0x...',
  yieldStrategy: 'aave-lending-v3',
  sourceChain: 1,
  destinationChain: 42161, // Arbitrum
});

// Track payment status
const status = await sdk.payments.getStatus(payment.id);
console.log('Current yield:', status.actualYield);
```

### 📊 Yield Optimization
Access real-time yield strategies from multiple DeFi protocols.

```typescript
// Get available strategies with live APY data
const strategies = await sdk.yield.getStrategies();

// Get personalized optimization
const optimization = await sdk.yield.optimize({
  amount: '10000.00',
  riskTolerance: 'moderate',
  timeHorizon: 30, // 30 days
});

console.log('Recommended strategy:', optimization.recommendedStrategy);
```

### 🌉 Cross-Chain Bridge
Execute cross-chain transactions with yield preservation during transit.

```typescript
// Estimate cross-chain transfer
const estimate = await sdk.crosschain.estimate({
  amount: '2500.00',
  token: 'USDC',
  sourceChain: 1,
  destinationChain: 137,
});

// Initiate bridge transaction
const bridge = await sdk.crosschain.transfer({
  amount: '2500.00',
  token: 'USDC',
  sourceChain: 1,
  destinationChain: 137,
  recipient: '0x...',
  yieldStrategy: 'resolv-delta-neutral',
});
```

### 🔗 External DeFi Integration
Access Noble (T-bills), Resolv (delta-neutral), Aave (lending), and Circle CCTP protocols.

```typescript
// Noble Protocol T-bills
const noblePools = await sdk.external.getNoblePools();
const bestTBill = noblePools.find(pool => pool.currentAPY === Math.max(...noblePools.map(p => p.currentAPY)));

// Resolv Protocol delta-neutral strategies
const resolvVaults = await sdk.external.getResolvVaults();
const deltaVault = resolvVaults.find(v => v.strategy === 'DELTA_NEUTRAL');

// Aave Protocol lending
const aaveMarkets = await sdk.external.getAaveMarkets();
const ethMarket = aaveMarkets.find(m => m.name.includes('Ethereum'));
```

### ⛓️ Blockchain Integration
Direct smart contract interaction with comprehensive blockchain helpers.

```typescript
// Deploy payment on-chain
const onChainPayment = await sdk.contracts.createOnChainPayment({
  amount: '1000.00',
  recipient: '0x...',
  yieldStrategy: 'noble-tbill-6m',
  provider: yourEthersProvider,
  signer: yourEthersSigner,
});

// Listen to real-time events
sdk.contracts.subscribeToBlockchainEvents('deposit', (event) => {
  console.log('New deposit:', event);
});
```

## 🛡️ Security & Best Practices

### API Key Management
```typescript
// Use environment variables for API keys
const sdk = new YieldRailsSDK({
  apiUrl: process.env.YIELDRAILS_API_URL,
  apiKey: process.env.YIELDRAILS_API_KEY,
});
```

### Error Handling
```typescript
try {
  const payment = await sdk.payments.create(paymentRequest);
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    // Handle insufficient balance
  } else if (error.code === 'INVALID_YIELD_STRATEGY') {
    // Handle invalid strategy
  }
  console.error('Payment creation failed:', error.message);
}
```

### Real-time Updates
```typescript
// Initialize WebSocket for real-time updates
await sdk.initializeWebSocket({
  autoReconnect: true,
  heartbeat: true,
});

// Subscribe to payment updates
sdk.payments.subscribe(payment.id, (update) => {
  console.log('Payment update:', update);
});

// Subscribe to yield updates
sdk.yield.subscribeToUpdates((yieldUpdate) => {
  console.log('Yield update:', yieldUpdate);
});
```

## 📖 Detailed Guides

### For Web Developers
- [React Integration Guide](./frameworks/react.md)
- [Next.js Integration Guide](./frameworks/nextjs.md)
- [Vue.js Integration Guide](./frameworks/vue.md)

### For Backend Developers
- [Node.js Integration](./backends/nodejs.md)
- [Python Integration](./backends/python.md)
- [REST API Usage](./backends/rest-api.md)

### For Blockchain Developers
- [Smart Contract Integration](./blockchain/contracts.md)
- [Wallet Integration](./blockchain/wallets.md)
- [Event Monitoring](./blockchain/events.md)

### For Mobile Developers
- [React Native Guide](./mobile/react-native.md)
- [Mobile Best Practices](./mobile/best-practices.md)

## 🌟 Examples & Tutorials

### Complete Examples
- [Payment Dashboard](../examples/payment-dashboard/)
- [Yield Optimizer](../examples/yield-optimizer/)
- [Cross-chain Wallet](../examples/cross-chain-wallet/)
- [DeFi Integration](../examples/defi-integration/)

### Use Case Tutorials
- [Building a Payment Gateway](./tutorials/payment-gateway.md)
- [Creating a Yield Farming Interface](./tutorials/yield-farming.md)
- [Cross-chain DeFi Dashboard](./tutorials/cross-chain-dashboard.md)
- [Merchant Integration](./tutorials/merchant-integration.md)

## 🤝 Community & Support

### Getting Help
- [GitHub Discussions](https://github.com/raosunjoy/YieldRails/discussions)
- [Discord Community](https://discord.gg/yieldrails)
- [Support Email](mailto:developers@yieldrails.com)

### Contributing
- [Contributing Guide](../../CONTRIBUTING.md)
- [Code of Conduct](../../CODE_OF_CONDUCT.md)
- [Development Setup](./development/setup.md)

### Resources
- [API Status](https://status.yieldrails.com)
- [Changelog](../../sdk/CHANGELOG.md)
- [Roadmap](../../ROADMAP.md)

## 📊 Platform Features

| Feature | Description | SDK Support | API Support |
|---------|-------------|-------------|-------------|
| **Payment Creation** | Yield-generating payments | ✅ Full | ✅ Complete |
| **Yield Optimization** | Real-time strategy optimization | ✅ Full | ✅ Complete |
| **Cross-chain Bridge** | Multi-chain transactions | ✅ Full | ✅ Complete |
| **Noble Protocol** | T-bill yield strategies | ✅ Full | ✅ Complete |
| **Resolv Protocol** | Delta-neutral strategies | ✅ Full | ✅ Complete |
| **Aave Protocol** | Lending yield strategies | ✅ Full | ✅ Complete |
| **Circle CCTP** | Cross-chain USDC transfers | ✅ Full | ✅ Complete |
| **Real-time Updates** | WebSocket event streaming | ✅ Full | ✅ Complete |
| **Blockchain Integration** | Direct contract interaction | ✅ Full | ✅ Complete |

## 🚦 Getting Started Checklist

- [ ] Install the YieldRails SDK
- [ ] Obtain API credentials
- [ ] Complete the [Quick Start Guide](./quick-start.md)
- [ ] Review the [Authentication Guide](./authentication.md)
- [ ] Try the [Basic Payment Example](./examples/basic-payment.md)
- [ ] Explore [Yield Strategies](./yield-optimization.md)
- [ ] Test [Cross-chain Transfers](./cross-chain-integration.md)
- [ ] Join the [Developer Community](https://discord.gg/yieldrails)

---

Ready to build the future of yield-generating payments? Start with our [Quick Start Guide](./quick-start.md) and begin integrating YieldRails today!