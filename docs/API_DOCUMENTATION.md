# YieldRails API Documentation

## Overview

The YieldRails API provides programmatic access to our DeFi yield optimization platform. This RESTful API allows developers to integrate YieldRails functionality into their applications, build custom interfaces, and automate yield strategies.

## Base URL

```
Production: https://api.yieldrails.com/v1
Staging: https://api-staging.yieldrails.com/v1
```

## Authentication

### API Key Authentication

All API requests require authentication using an API key in the request header:

```http
Authorization: Bearer YOUR_API_KEY
```

### Getting an API Key

1. Log in to your YieldRails dashboard
2. Navigate to Settings > API Keys
3. Click "Generate New API Key"
4. Set permissions and expiration
5. Save the key securely (it won't be shown again)

### API Key Permissions

- **Read**: View portfolio and market data
- **Trade**: Execute yield strategies and rebalancing
- **Withdraw**: Withdraw funds from strategies
- **Admin**: Full account management

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **Rate limit headers** are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success",
  "timestamp": "2024-01-15T10:30:00Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid parameter: amount must be greater than 0",
    "details": {
      "field": "amount",
      "value": "-100"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Endpoints

### Authentication

#### POST /auth/login

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "twoFactorCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "kycStatus": "verified"
    }
  }
}
```

#### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

### User Management

#### GET /user/profile

Get user profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "country": "US",
    "kycStatus": "verified",
    "kycLevel": 2,
    "twoFactorEnabled": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-15T10:00:00Z"
  }
}
```

#### PUT /user/profile

Update user profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "preferences": {
    "riskTolerance": "moderate",
    "autoOptimization": true,
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```

### Portfolio Management

#### GET /portfolio

Get portfolio overview and summary.

**Query Parameters:**
- `include`: Additional data to include (positions, performance, allocation)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "portfolio_123",
    "totalValue": 125000.50,
    "totalDeposited": 120000.00,
    "totalYieldEarned": 5000.50,
    "currentApy": 0.085,
    "riskScore": 42,
    "currency": "USD",
    "performance": {
      "day": {
        "change": 250.75,
        "changePercent": 0.002
      },
      "week": {
        "change": 1200.30,
        "changePercent": 0.0096
      },
      "month": {
        "change": 3500.80,
        "changePercent": 0.028
      },
      "year": {
        "change": 8500.50,
        "changePercent": 0.072
      }
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /portfolio/positions

Get all active positions in the portfolio.

**Query Parameters:**
- `status`: Filter by position status (active, closed, pending)
- `strategy`: Filter by strategy ID
- `limit`: Number of results per page (default: 20)
- `page`: Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "position_123",
      "strategyId": "aave-usdc-lending",
      "strategyName": "Aave USDC Lending",
      "asset": "USDC",
      "amount": 50000.00,
      "value": 52150.30,
      "apy": 0.086,
      "riskLevel": "low",
      "status": "active",
      "entryDate": "2024-01-01T00:00:00Z",
      "yieldEarned": 2150.30,
      "allocation": 0.416
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

#### GET /portfolio/performance

Get detailed portfolio performance metrics.

**Query Parameters:**
- `period`: Time period (1d, 7d, 30d, 90d, 1y, all)
- `metrics`: Specific metrics to include (returns, risk, sharpe, drawdown)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "returns": {
      "total": 0.028,
      "annualized": 0.085,
      "volatility": 0.18,
      "sharpeRatio": 1.45
    },
    "risk": {
      "riskScore": 42,
      "maxDrawdown": 0.12,
      "valueAtRisk": 0.08,
      "diversificationRatio": 1.32
    },
    "timeSeries": [
      {
        "date": "2024-01-01T00:00:00Z",
        "value": 120000.00,
        "return": 0.0,
        "cumulativeReturn": 0.0
      },
      {
        "date": "2024-01-02T00:00:00Z",
        "value": 120150.30,
        "return": 0.00125,
        "cumulativeReturn": 0.00125
      }
    ]
  }
}
```

### Yield Strategies

#### GET /strategies

Get available yield strategies.

**Query Parameters:**
- `riskLevel`: Filter by risk level (low, medium, high)
- `minApy`: Minimum APY filter
- `maxApy`: Maximum APY filter
- `asset`: Filter by supported asset
- `protocol`: Filter by DeFi protocol
- `network`: Filter by blockchain network

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "aave-usdc-lending",
      "name": "Aave USDC Lending",
      "description": "Earn interest by lending USDC on Aave protocol",
      "protocol": "Aave",
      "network": "Ethereum",
      "asset": "USDC",
      "currentApy": 0.086,
      "riskLevel": "low",
      "riskScore": 25,
      "tvl": 1250000000,
      "minimumDeposit": 100,
      "fees": {
        "management": 0.01,
        "performance": 0.1,
        "withdrawal": 0.0
      },
      "features": [
        "Instant liquidity",
        "Compound interest",
        "Insurance available"
      ],
      "risks": [
        "Smart contract risk",
        "Protocol governance risk"
      ]
    }
  ]
}
```

#### GET /strategies/{strategyId}

Get detailed information about a specific strategy.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "aave-usdc-lending",
    "name": "Aave USDC Lending",
    "description": "Earn interest by lending USDC on Aave protocol",
    "protocol": "Aave",
    "network": "Ethereum",
    "asset": "USDC",
    "currentApy": 0.086,
    "historicalApy": {
      "7d": 0.085,
      "30d": 0.087,
      "90d": 0.089
    },
    "riskLevel": "low",
    "riskScore": 25,
    "tvl": 1250000000,
    "utilization": 0.78,
    "minimumDeposit": 100,
    "fees": {
      "management": 0.01,
      "performance": 0.1,
      "withdrawal": 0.0
    },
    "analytics": {
      "sharpeRatio": 2.1,
      "maxDrawdown": 0.05,
      "volatility": 0.08,
      "correlation": {
        "bitcoin": 0.12,
        "ethereum": 0.15,
        "market": 0.08
      }
    },
    "contractAddresses": {
      "strategy": "0x1234567890abcdef1234567890abcdef12345678",
      "underlying": "0xA0b86a33E6441a8b32c46e29b50d0AAC51A9a5B1"
    }
  }
}
```

### Deposits and Withdrawals

#### POST /deposits

Create a new deposit into a yield strategy.

**Request Body:**
```json
{
  "strategyId": "aave-usdc-lending",
  "amount": 10000.00,
  "asset": "USDC",
  "slippage": 0.005,
  "gasPrice": "fast"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "deposit_123",
    "strategyId": "aave-usdc-lending",
    "amount": 10000.00,
    "asset": "USDC",
    "status": "pending",
    "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "gasEstimate": {
      "gasLimit": 150000,
      "gasPrice": "20000000000",
      "gasCost": "0.003"
    },
    "expectedShares": 9950.25,
    "estimatedApy": 0.086,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /withdrawals

Create a withdrawal request from a yield strategy.

**Request Body:**
```json
{
  "strategyId": "aave-usdc-lending",
  "amount": 5000.00,
  "type": "partial",
  "slippage": 0.005
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "withdrawal_123",
    "strategyId": "aave-usdc-lending",
    "amount": 5000.00,
    "type": "partial",
    "status": "pending",
    "estimatedReceive": 4975.50,
    "fees": 24.50,
    "processingTime": "instant",
    "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /transactions

Get transaction history.

**Query Parameters:**
- `type`: Filter by transaction type (deposit, withdrawal, yield, rebalance)
- `status`: Filter by status (pending, completed, failed)
- `strategyId`: Filter by strategy
- `startDate`: Start date filter (ISO 8601)
- `endDate`: End date filter (ISO 8601)
- `limit`: Number of results per page
- `page`: Page number

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tx_123",
      "type": "deposit",
      "strategyId": "aave-usdc-lending",
      "strategyName": "Aave USDC Lending",
      "amount": 10000.00,
      "asset": "USDC",
      "status": "completed",
      "transactionHash": "0xabcdef...",
      "blockNumber": 18500000,
      "gasUsed": 145000,
      "gasCost": "0.0029",
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:32:15Z"
    }
  ]
}
```

### Optimization

#### GET /optimization/recommendations

Get AI-powered optimization recommendations.

**Query Parameters:**
- `riskTolerance`: Risk tolerance level (conservative, moderate, aggressive)
- `timeHorizon`: Investment time horizon (1d, 7d, 30d, 90d)
- `excludeStrategies`: Comma-separated list of strategy IDs to exclude

**Response:**
```json
{
  "success": true,
  "data": {
    "currentScore": 85,
    "optimizedScore": 92,
    "recommendations": [
      {
        "type": "rebalance",
        "strategyId": "aave-usdc-lending",
        "currentAllocation": 0.35,
        "recommendedAllocation": 0.40,
        "reason": "Higher risk-adjusted returns available",
        "expectedImpact": {
          "apyImprovement": 0.008,
          "riskReduction": 0.02,
          "confidence": 0.78
        }
      },
      {
        "type": "new_strategy",
        "strategyId": "compound-usdt-lending",
        "recommendedAllocation": 0.15,
        "reason": "Diversification opportunity with favorable yield",
        "expectedImpact": {
          "apyImprovement": 0.012,
          "riskReduction": 0.05,
          "confidence": 0.85
        }
      }
    ],
    "marketConditions": {
      "sentiment": "bullish",
      "volatility": "medium",
      "liquidityConditions": "good"
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /optimization/rebalance

Execute portfolio rebalancing.

**Request Body:**
```json
{
  "recommendations": [
    {
      "strategyId": "aave-usdc-lending",
      "targetAllocation": 0.40
    },
    {
      "strategyId": "compound-usdt-lending",
      "targetAllocation": 0.15
    }
  ],
  "slippage": 0.005,
  "gasPrice": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rebalanceId": "rebalance_123",
    "status": "pending",
    "transactions": [
      {
        "type": "withdrawal",
        "strategyId": "yearn-vault-usdc",
        "amount": 5000.00,
        "transactionHash": "0xabcdef..."
      },
      {
        "type": "deposit",
        "strategyId": "aave-usdc-lending",
        "amount": 5000.00,
        "transactionHash": "0x123456..."
      }
    ],
    "estimatedCompletion": "2024-01-15T10:35:00Z",
    "totalGasCost": "0.008",
    "expectedImpact": {
      "apyImprovement": 0.008,
      "riskReduction": 0.02
    }
  }
}
```

### Market Data

#### GET /market/assets

Get supported assets and their current prices.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "USDC",
      "name": "USD Coin",
      "price": 1.00,
      "change24h": 0.0001,
      "changePercent24h": 0.01,
      "marketCap": 25000000000,
      "volume24h": 5000000000,
      "networks": ["ethereum", "polygon", "arbitrum"],
      "decimals": 6,
      "coingeckoId": "usd-coin"
    }
  ]
}
```

#### GET /market/yields

Get current yield rates across protocols.

**Query Parameters:**
- `asset`: Filter by asset
- `protocol`: Filter by protocol
- `minTvl`: Minimum TVL filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "protocol": "Aave",
      "asset": "USDC",
      "network": "Ethereum",
      "supplyApy": 0.086,
      "borrowApy": 0.092,
      "totalSupply": 1250000000,
      "totalBorrow": 975000000,
      "utilizationRate": 0.78,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Analytics

#### GET /analytics/performance

Get detailed performance analytics.

**Query Parameters:**
- `period`: Analysis period (7d, 30d, 90d, 1y)
- `benchmark`: Benchmark to compare against
- `granularity`: Data granularity (hour, day, week)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "portfolioReturn": 0.028,
    "benchmarkReturn": 0.015,
    "alpha": 0.013,
    "beta": 0.85,
    "sharpeRatio": 1.45,
    "informationRatio": 1.2,
    "maxDrawdown": 0.12,
    "volatility": 0.18,
    "winRate": 0.65,
    "profitFactor": 1.8,
    "attribution": {
      "assetAllocation": 0.008,
      "strategySelection": 0.012,
      "timing": 0.003,
      "other": 0.005
    }
  }
}
```

## WebSocket API

### Connection

Connect to real-time data feeds:

```
Production: wss://api.yieldrails.com/v1/ws
Staging: wss://api-staging.yieldrails.com/v1/ws
```

### Authentication

Send authentication message after connection:

```json
{
  "type": "auth",
  "token": "YOUR_API_KEY"
}
```

### Subscriptions

#### Portfolio Updates

```json
{
  "type": "subscribe",
  "channel": "portfolio",
  "params": {
    "userId": "user_123"
  }
}
```

#### Price Updates

```json
{
  "type": "subscribe",
  "channel": "prices",
  "params": {
    "assets": ["USDC", "ETH", "WBTC"]
  }
}
```

#### Yield Updates

```json
{
  "type": "subscribe",
  "channel": "yields",
  "params": {
    "strategies": ["aave-usdc-lending", "compound-usdt"]
  }
}
```

### Message Format

```json
{
  "type": "portfolio_update",
  "channel": "portfolio",
  "data": {
    "totalValue": 125150.75,
    "change": 150.25,
    "changePercent": 0.0012,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @yieldrails/sdk
```

```typescript
import { YieldRailsClient } from '@yieldrails/sdk';

const client = new YieldRailsClient({
  apiKey: 'your-api-key',
  environment: 'production' // or 'staging'
});

// Get portfolio
const portfolio = await client.portfolio.get();

// Get strategies
const strategies = await client.strategies.list();

// Make deposit
const deposit = await client.deposits.create({
  strategyId: 'aave-usdc-lending',
  amount: 1000,
  asset: 'USDC'
});
```

### Python

```bash
pip install yieldrails-python
```

```python
from yieldrails import YieldRailsClient

client = YieldRailsClient(
    api_key='your-api-key',
    environment='production'
)

# Get portfolio
portfolio = client.portfolio.get()

# Get strategies
strategies = client.strategies.list()

# Make deposit
deposit = client.deposits.create(
    strategy_id='aave-usdc-lending',
    amount=1000,
    asset='USDC'
)
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request validation failed |
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMITED` | Rate limit exceeded |
| `INSUFFICIENT_BALANCE` | Insufficient account balance |
| `STRATEGY_UNAVAILABLE` | Strategy temporarily unavailable |
| `NETWORK_ERROR` | Blockchain network error |
| `INTERNAL_ERROR` | Internal server error |

## Webhooks

### Configuration

Configure webhooks in your dashboard under Settings > Webhooks.

### Events

- `deposit.completed`
- `withdrawal.completed`
- `position.opened`
- `position.closed`
- `rebalance.completed`
- `portfolio.risk_alert`

### Payload Example

```json
{
  "event": "deposit.completed",
  "data": {
    "id": "deposit_123",
    "userId": "user_123",
    "strategyId": "aave-usdc-lending",
    "amount": 10000.00,
    "asset": "USDC",
    "transactionHash": "0xabcdef...",
    "completedAt": "2024-01-15T10:32:15Z"
  },
  "timestamp": "2024-01-15T10:32:15Z",
  "signature": "sha256=abcdef..."
}
```

## Support

- **Documentation**: [docs.yieldrails.com](https://docs.yieldrails.com)
- **API Support**: api-support@yieldrails.com
- **Discord**: [discord.gg/yieldrails](https://discord.gg/yieldrails)
- **Status Page**: [status.yieldrails.com](https://status.yieldrails.com)