# SDK Reference

Complete reference documentation for the YieldRails TypeScript SDK v0.4.0.

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Core Classes](#core-classes)
- [Service Classes](#service-classes)
- [Blockchain Integration](#blockchain-integration)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Installation & Setup

### Installation

```bash
npm install @yieldrails/sdk
# or
yarn add @yieldrails/sdk
```

### Basic Setup

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-api-key',
  // Optional configuration
  timeout: 30000,
  retryAttempts: 3,
});
```

### Configuration Options

```typescript
interface SDKConfig {
  apiUrl: string;           // YieldRails API base URL
  apiKey?: string;          // API key for authentication
  timeout?: number;         // Request timeout in milliseconds (default: 30000)
  retryAttempts?: number;   // Number of retry attempts (default: 3)
  retryDelay?: number;      // Delay between retries in ms (default: 1000)
  debug?: boolean;          // Enable debug logging (default: false)
}
```

## Core Classes

### YieldRailsSDK

The main SDK class that provides access to all services and functionality.

```typescript
class YieldRailsSDK {
  // Service instances
  public readonly auth: AuthService;
  public readonly payments: PaymentService;
  public readonly yield: YieldService;
  public readonly crosschain: CrossChainService;
  public readonly compliance: ComplianceService;
  public readonly external: ExternalService;
  public readonly blockchain: ContractHelper;
  public readonly contracts: YieldRailsContracts;

  constructor(config: SDKConfig);
  
  // WebSocket initialization
  initializeWebSocket(config?: WebSocketConfig): Promise<void>;
  disconnect(): Promise<void>;
  
  // Health and status
  getHealth(): Promise<HealthResponse>;
  getVersion(): string;
}
```

### WebSocket Configuration

```typescript
interface WebSocketConfig {
  autoReconnect?: boolean;  // Auto-reconnect on connection loss
  heartbeat?: boolean;      // Enable heartbeat ping/pong
  reconnectDelay?: number;  // Delay between reconnection attempts
  maxReconnectAttempts?: number; // Maximum reconnection attempts
}
```

## Service Classes

### AuthService

Handle user authentication and authorization.

```typescript
class AuthService {
  // User registration
  async register(request: RegisterRequest): Promise<AuthResponse>;
  
  // User login
  async login(request: LoginRequest): Promise<AuthResponse>;
  
  // Token refresh
  async refreshToken(refreshToken: string): Promise<TokenResponse>;
  
  // User profile
  async getProfile(): Promise<User>;
  async updateProfile(updates: Partial<User>): Promise<User>;
  
  // Logout
  async logout(): Promise<void>;
}
```

#### Registration & Login

```typescript
// Email/password registration
const authResponse = await sdk.auth.register({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe',
  userType: 'individual'
});

// Wallet-based registration
const authResponse = await sdk.auth.register({
  walletAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  signature: 'signed_message_here',
  message: 'Welcome to YieldRails',
  name: 'John Doe',
  userType: 'individual'
});

// Login
const authResponse = await sdk.auth.login({
  email: 'user@example.com',
  password: 'securePassword123'
});
```

### PaymentService

Create and manage yield-generating payments.

```typescript
class PaymentService {
  // Payment management
  async create(request: CreatePaymentRequest): Promise<Payment>;
  async getAll(options?: PaginationOptions): Promise<PaginatedResponse<Payment>>;
  async getById(paymentId: string): Promise<Payment>;
  async getDetails(paymentId: string): Promise<PaymentDetails>;
  async update(paymentId: string, updates: UpdatePaymentRequest): Promise<Payment>;
  async cancel(paymentId: string): Promise<Payment>;
  async release(paymentId: string, signature: string): Promise<PaymentReleaseResponse>;
  
  // Real-time subscriptions
  subscribe(paymentId: string, callback: (update: Payment) => void): void;
  unsubscribe(paymentId: string): void;
  
  // Analytics
  async getAnalytics(options?: AnalyticsOptions): Promise<PaymentAnalytics>;
}
```

#### Creating Payments

```typescript
// Basic payment creation
const payment = await sdk.payments.create({
  amount: '1000.00',
  token: 'USDC',
  recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  yieldStrategy: 'noble-tbill-3m',
  sourceChain: 1,      // Ethereum
  destinationChain: 137, // Polygon
  memo: 'Payment for services'
});

// Scheduled payment
const scheduledPayment = await sdk.payments.create({
  amount: '500.00',
  token: 'USDC',
  recipient: '0x...',
  yieldStrategy: 'aave-lending-v3',
  sourceChain: 1,
  destinationChain: 42161, // Arbitrum
  releaseDate: new Date('2024-01-15T10:00:00Z')
});
```

#### Payment Monitoring

```typescript
// Subscribe to payment updates
sdk.payments.subscribe(payment.id, (update) => {
  console.log('Payment status:', update.status);
  console.log('Yield earned:', update.actualYield);
});

// Get payment details
const details = await sdk.payments.getDetails(payment.id);
console.log('Yield breakdown:', details.yieldBreakdown);
console.log('Bridge details:', details.bridgeDetails);
```

### YieldService

Access yield strategies and optimization features.

```typescript
class YieldService {
  // Strategy management
  async getStrategies(): Promise<YieldStrategy[]>;
  async getStrategy(strategyId: string): Promise<YieldStrategy>;
  async getComparison(): Promise<StrategyComparison>;
  
  // Yield optimization
  async optimize(request: YieldOptimizationRequest): Promise<YieldOptimizationResponse>;
  async getOptimalAllocation(amount: string, riskProfile: RiskProfile): Promise<AllocationRecommendation>;
  
  // Performance tracking
  async getPerformance(strategyId: string, timeframe?: string): Promise<PerformanceMetrics>;
  async getUserYieldHistory(options?: HistoryOptions): Promise<YieldHistory[]>;
  
  // Real-time subscriptions
  subscribeToUpdates(callback: (update: YieldUpdate) => void): void;
  subscribeToStrategy(strategyId: string, callback: (update: StrategyUpdate) => void): void;
}
```

#### Yield Strategy Usage

```typescript
// Get all available strategies
const strategies = await sdk.yield.getStrategies();

// Filter strategies by criteria
const lowRiskStrategies = strategies.filter(s => s.riskLevel === 'low');
const highYieldStrategies = strategies
  .filter(s => s.actualAPY > 5.0)
  .sort((a, b) => b.actualAPY - a.actualAPY);

// Get yield optimization
const optimization = await sdk.yield.optimize({
  amount: '10000.00',
  riskTolerance: 'moderate',
  timeHorizon: 90, // 90 days
  preferredChains: [1, 137, 42161] // Ethereum, Polygon, Arbitrum
});

console.log('Recommended strategy:', optimization.recommendedStrategy);
console.log('Projected returns:', optimization.projectedReturns);
```

### CrossChainService

Handle cross-chain transactions and bridge operations.

```typescript
class CrossChainService {
  // Bridge operations
  async estimate(request: BridgeEstimateRequest): Promise<BridgeEstimate>;
  async transfer(request: BridgeTransferRequest): Promise<BridgeTransaction>;
  async getTransaction(transactionId: string): Promise<BridgeTransaction>;
  async getTransactionHistory(options?: HistoryOptions): Promise<BridgeTransaction[]>;
  
  // Chain information
  async getSupportedChains(): Promise<ChainInfo[]>;
  async getChainStatus(chainId: number): Promise<ChainStatus>;
  
  // Liquidity and fees
  async getLiquidityInfo(chainId: number): Promise<LiquidityInfo>;
  async getCurrentFees(): Promise<BridgeFees>;
  
  // Monitoring
  subscribeToTransaction(transactionId: string, callback: (update: BridgeTransaction) => void): void;
}
```

#### Cross-Chain Bridge Usage

```typescript
// Estimate bridge costs
const estimate = await sdk.crosschain.estimate({
  amount: '2500.00',
  token: 'USDC',
  sourceChain: 1,      // Ethereum
  destinationChain: 137 // Polygon
});

console.log('Bridge fee:', estimate.fees.bridgeFee);
console.log('Gas fee:', estimate.fees.gasFee);
console.log('Total fee:', estimate.fees.totalFee);
console.log('Estimated time:', estimate.estimatedTime, 'seconds');

// Execute bridge transaction
const bridgeTransaction = await sdk.crosschain.transfer({
  amount: '2500.00',
  token: 'USDC',
  sourceChain: 1,
  destinationChain: 137,
  recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  yieldStrategy: 'resolv-delta-neutral' // Earn yield during transit
});

// Monitor transaction progress
sdk.crosschain.subscribeToTransaction(bridgeTransaction.id, (update) => {
  console.log('Bridge status:', update.status);
  console.log('Yield earned during transit:', update.yieldEarned);
});
```

### ExternalService

Access external DeFi protocol integrations.

```typescript
class ExternalService {
  // Service health
  async getServiceHealth(): Promise<ExternalServiceHealth>;
  async getCircuitBreakerStatus(): Promise<Record<string, CircuitBreakerStatus>>;
  async resetCircuitBreaker(serviceName: string): Promise<{ success: boolean }>;
  
  // Noble Protocol (T-bills)
  async getNoblePools(): Promise<NoblePool[]>;
  async getNoblePool(poolId: string): Promise<NoblePool>;
  async initiateNobleDeposit(request: NobleDepositRequest): Promise<NobleDepositResponse>;
  async getNoblePosition(poolId: string, userAddress: string): Promise<NoblePosition | null>;
  
  // Resolv Protocol (Delta-neutral)
  async getResolvVaults(): Promise<ResolvVault[]>;
  async getResolvVault(vaultId: string): Promise<ResolvVault>;
  async enterResolvPosition(request: ResolvPositionRequest): Promise<ResolvPositionResponse>;
  async getResolvPosition(vaultId: string, userAddress: string): Promise<ResolvPosition | null>;
  
  // Aave Protocol (Lending)
  async getAaveMarkets(): Promise<AaveMarket[]>;
  async getAaveMarketAssets(marketId: string): Promise<AaveAsset[]>;
  async supplyToAave(request: AaveSupplyRequest): Promise<AaveSupplyResponse>;
  async getAaveUserData(marketId: string, userAddress: string): Promise<AaveUserData>;
  
  // Circle CCTP (Cross-chain)
  async getCircleSupportedChains(): Promise<CircleChain[]>;
  async initiateCircleTransfer(request: CircleTransferRequest): Promise<CircleTransferInfo>;
  async getCircleTransferStatus(transferId: string): Promise<CircleTransferInfo>;
  async getCircleTransferFees(request: CircleFeeRequest): Promise<CircleFees>;
}
```

#### External Service Usage

```typescript
// Check service health
const health = await sdk.external.getServiceHealth();
console.log('External services status:', health.status);
console.log('Service details:', health.services);

// Noble Protocol T-bills
const noblePools = await sdk.external.getNoblePools();
const bestTBillPool = noblePools
  .filter(pool => pool.status === 'ACTIVE')
  .sort((a, b) => b.currentAPY - a.currentAPY)[0];

const nobleDeposit = await sdk.external.initiateNobleDeposit({
  poolId: bestTBillPool.poolId,
  amount: '5000000000', // 5000 USDC (6 decimals)
  userAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  referralCode: 'YIELDRAILS'
});

// Resolv Protocol delta-neutral strategies
const resolvVaults = await sdk.external.getResolvVaults();
const deltaVault = resolvVaults.find(v => v.strategy === 'DELTA_NEUTRAL');

const resolvPosition = await sdk.external.enterResolvPosition({
  vaultId: deltaVault.vaultId,
  amount: '10000000000000000000000', // 10000 tokens
  userAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  slippageTolerance: 100, // 1%
  deadline: Math.floor(Date.now() / 1000) + 1800 // 30 minutes
});

// Aave Protocol lending
const aaveMarkets = await sdk.external.getAaveMarkets();
const ethMarket = aaveMarkets.find(m => m.name.includes('Ethereum'));
const assets = await sdk.external.getAaveMarketAssets(ethMarket.marketId);
const usdcAsset = assets.find(a => a.symbol === 'USDC');

const aaveSupply = await sdk.external.supplyToAave({
  marketId: ethMarket.marketId,
  asset: usdcAsset.symbol,
  amount: '10000000000', // 10000 USDC
  userAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8'
});
```

## Blockchain Integration

### ContractHelper

Low-level blockchain interaction utilities.

```typescript
class ContractHelper {
  // Provider management
  setProvider(provider: ethers.Provider): void;
  setSigner(signer: ethers.Signer): void;
  getProvider(): ethers.Provider | null;
  getSigner(): ethers.Signer | null;
  
  // Contract interactions
  async getContract(address: string, abi: any[]): Promise<ethers.Contract>;
  async estimateGas(contract: ethers.Contract, method: string, params: any[]): Promise<bigint>;
  async sendTransaction(contract: ethers.Contract, method: string, params: any[], options?: any): Promise<ethers.TransactionResponse>;
  
  // Utilities
  async getBlockNumber(): Promise<number>;
  async getGasPrice(): Promise<bigint>;
  async waitForTransaction(txHash: string, confirmations?: number): Promise<ethers.TransactionReceipt>;
  formatUnits(value: bigint, decimals: number): string;
  parseUnits(value: string, decimals: number): bigint;
}
```

### YieldRailsContracts

High-level smart contract interactions.

```typescript
class YieldRailsContracts {
  // Contract deployment and interaction
  async createOnChainPayment(params: OnChainPaymentParams): Promise<OnChainPaymentResult>;
  async getRealtimeYield(paymentId: string): Promise<string>;
  async initiateBridgeOnChain(params: BridgeParams): Promise<BridgeResult>;
  
  // Event subscriptions
  subscribeToBlockchainEvents(eventType: string, callback: (event: any) => void): void;
  subscribeToDepositEvents(callback: (event: DepositEvent) => void): void;
  subscribeToYieldEvents(callback: (event: YieldEvent) => void): void;
  subscribeToBridgeEvents(callback: (event: BridgeEvent) => void): void;
  
  // Contract information
  getContractAddresses(chainId: number): ContractAddresses;
  getDeploymentInfo(chainId: number): DeploymentInfo;
}
```

#### Contract Usage

```typescript
import { ethers } from 'ethers';

// Set up provider and signer
const provider = new ethers.JsonRpcProvider('https://ethereum-rpc-url');
const signer = new ethers.Wallet('private-key', provider);

sdk.blockchain.setProvider(provider);
sdk.blockchain.setSigner(signer);

// Create on-chain payment
const onChainPayment = await sdk.contracts.createOnChainPayment({
  amount: '1000000000', // 1000 USDC (6 decimals)
  recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
  yieldStrategy: 'noble-tbill-6m',
  chainId: 1
});

console.log('Transaction hash:', onChainPayment.transactionHash);
console.log('Payment ID:', onChainPayment.paymentId);

// Subscribe to events
sdk.contracts.subscribeToDepositEvents((event) => {
  console.log('New deposit:', event);
});

sdk.contracts.subscribeToYieldEvents((event) => {
  console.log('Yield update:', event);
});
```

## Type Definitions

### Common Types

```typescript
// API Response wrapper
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

// Pagination
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Chain information
interface ChainInfo {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
```

### Payment Types

```typescript
interface CreatePaymentRequest {
  amount: string;
  token: string;
  recipient: string;
  yieldStrategy: string;
  sourceChain: number;
  destinationChain: number;
  memo?: string;
  releaseDate?: Date;
}

interface Payment {
  id: string;
  amount: string;
  token: string;
  recipient: string;
  sender: string;
  status: PaymentStatus;
  yieldStrategy: string;
  estimatedYield: string;
  actualYield?: string;
  sourceChain: number;
  destinationChain: number;
  memo?: string;
  createdAt: Date;
  releaseDate?: Date;
  releasedAt?: Date;
}

enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  YIELDING = 'yielding',
  RELEASED = 'released',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}
```

### Yield Types

```typescript
interface YieldStrategy {
  id: string;
  name: string;
  description: string;
  protocolName: string;
  chainId: number;
  strategyType: 'lending' | 'liquidity_mining' | 't_bills' | 'delta_neutral';
  expectedAPY: number;
  actualAPY: number;
  riskLevel: 'low' | 'medium' | 'high';
  minAmount: string;
  maxAmount?: string;
  totalValueLocked: string;
  isActive: boolean;
  realTimeData?: {
    lastUpdated: Date;
    source: string;
    status: string;
  };
}

interface YieldOptimizationRequest {
  amount: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: number; // days
  preferredChains?: number[];
}

interface YieldOptimizationResponse {
  recommendedStrategy: YieldStrategy;
  alternativeStrategies: YieldStrategy[];
  projectedReturns: {
    daily: string;
    monthly: string;
    annually: string;
  };
  riskAnalysis: {
    volatility: number;
    maxDrawdown: string;
    sharpeRatio: number;
  };
}
```

## Error Handling

### YieldRailsError

```typescript
class YieldRailsError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}
```

### Error Codes

```typescript
// Authentication errors
'AUTH_INVALID_CREDENTIALS'   // Invalid login credentials
'AUTH_TOKEN_EXPIRED'        // JWT token has expired
'AUTH_INSUFFICIENT_PERMISSIONS' // User lacks required permissions

// Payment errors
'PAYMENT_INSUFFICIENT_BALANCE'  // Insufficient balance for payment
'PAYMENT_INVALID_STRATEGY'     // Invalid or unavailable yield strategy
'PAYMENT_CHAIN_NOT_SUPPORTED'  // Blockchain not supported
'PAYMENT_AMOUNT_TOO_LOW'       // Payment amount below minimum
'PAYMENT_AMOUNT_TOO_HIGH'      // Payment amount above maximum

// Bridge errors
'BRIDGE_INSUFFICIENT_LIQUIDITY' // Insufficient bridge liquidity
'BRIDGE_CHAIN_CONGESTION'      // Target chain is congested
'BRIDGE_INVALID_ROUTE'         // Invalid cross-chain route

// External service errors
'EXTERNAL_SERVICE_UNAVAILABLE' // External service is down
'EXTERNAL_CIRCUIT_BREAKER_OPEN' // Circuit breaker is open
'EXTERNAL_RATE_LIMIT_EXCEEDED'  // Rate limit exceeded

// General errors
'RATE_LIMIT_EXCEEDED'         // API rate limit exceeded
'VALIDATION_ERROR'            // Request validation failed
'NETWORK_ERROR'               // Network connectivity issue
'INTERNAL_SERVER_ERROR'       // Unexpected server error
```

### Error Handling Examples

```typescript
import { YieldRailsError } from '@yieldrails/sdk';

try {
  const payment = await sdk.payments.create(paymentRequest);
} catch (error) {
  if (error instanceof YieldRailsError) {
    switch (error.code) {
      case 'PAYMENT_INSUFFICIENT_BALANCE':
        console.error('Insufficient balance:', error.message);
        // Handle insufficient balance
        break;
      case 'PAYMENT_INVALID_STRATEGY':
        console.error('Invalid strategy:', error.message);
        // Show available strategies
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.error('Rate limited:', error.message);
        // Implement backoff strategy
        break;
      default:
        console.error('YieldRails error:', error.code, error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

### Complete Payment Workflow

```typescript
async function completePaymentWorkflow() {
  try {
    // 1. Get optimal yield strategy
    const optimization = await sdk.yield.optimize({
      amount: '5000.00',
      riskTolerance: 'moderate',
      timeHorizon: 30
    });

    // 2. Create payment
    const payment = await sdk.payments.create({
      amount: '5000.00',
      token: 'USDC',
      recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
      yieldStrategy: optimization.recommendedStrategy.id,
      sourceChain: 1,
      destinationChain: 137
    });

    // 3. Monitor payment
    await sdk.initializeWebSocket();
    sdk.payments.subscribe(payment.id, (update) => {
      console.log(`Payment ${update.id}: ${update.status}, Yield: ${update.actualYield}`);
    });

    // 4. Get real-time yield updates
    sdk.yield.subscribeToUpdates((yieldUpdate) => {
      console.log('Yield update:', yieldUpdate);
    });

    return payment;
  } catch (error) {
    console.error('Payment workflow failed:', error);
    throw error;
  }
}
```

### Cross-Chain Yield Arbitrage

```typescript
async function crossChainYieldArbitrage() {
  // Find best yield opportunities across chains
  const strategies = await sdk.yield.getStrategies();
  
  const chainStrategies = strategies.reduce((acc, strategy) => {
    if (!acc[strategy.chainId]) acc[strategy.chainId] = [];
    acc[strategy.chainId].push(strategy);
    return acc;
  }, {} as Record<number, YieldStrategy[]>);

  // Find highest yield opportunity
  let bestStrategy: YieldStrategy | null = null;
  let bestChain = 0;

  for (const [chainId, chainStrategies] of Object.entries(chainStrategies)) {
    const bestOnChain = chainStrategies.sort((a, b) => b.actualAPY - a.actualAPY)[0];
    if (!bestStrategy || bestOnChain.actualAPY > bestStrategy.actualAPY) {
      bestStrategy = bestOnChain;
      bestChain = parseInt(chainId);
    }
  }

  if (!bestStrategy) {
    throw new Error('No suitable strategies found');
  }

  // Bridge to optimal chain if necessary
  const currentChain = 1; // Ethereum
  if (bestChain !== currentChain) {
    const bridgeEstimate = await sdk.crosschain.estimate({
      amount: '10000.00',
      token: 'USDC',
      sourceChain: currentChain,
      destinationChain: bestChain
    });

    console.log(`Bridge cost: ${bridgeEstimate.fees.totalFee} USDC`);
    console.log(`Target APY: ${bestStrategy.actualAPY}%`);

    // Execute bridge with yield strategy
    const bridge = await sdk.crosschain.transfer({
      amount: '10000.00',
      token: 'USDC',
      sourceChain: currentChain,
      destinationChain: bestChain,
      recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
      yieldStrategy: bestStrategy.id
    });

    console.log(`Bridge initiated: ${bridge.id}`);
    return bridge;
  }

  // Create payment on current chain
  const payment = await sdk.payments.create({
    amount: '10000.00',
    token: 'USDC',
    recipient: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
    yieldStrategy: bestStrategy.id,
    sourceChain: currentChain,
    destinationChain: currentChain
  });

  console.log(`Payment created: ${payment.id}`);
  return payment;
}
```

---

For more examples and advanced usage patterns, see the [Examples Directory](../examples/) and [Integration Guides](./frameworks/).