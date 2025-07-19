# YieldRails Developer Guide

## Overview

This guide provides comprehensive information for developers who want to integrate with YieldRails, contribute to the platform, or build applications using our APIs and SDKs.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Architecture Overview](#architecture-overview)
4. [API Integration](#api-integration)
5. [SDK Usage](#sdk-usage)
6. [Smart Contract Integration](#smart-contract-integration)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Contributing](#contributing)
10. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm** or **yarn**: Latest stable version
- **Git**: For version control
- **Docker**: For containerized development (optional)
- **MetaMask**: For blockchain interaction testing

### Quick Setup

1. **Clone the Repository**
```bash
git clone https://github.com/yieldrails/yieldrails-platform.git
cd yieldrails-platform
```

2. **Install Dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Configuration**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Start Development Server**
```bash
npm run dev
# or
yarn dev
```

### Project Structure

```
yieldrails-platform/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Custom middleware
│   │   └── utils/           # Utility functions
│   ├── tests/               # Backend tests
│   └── package.json
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # State management
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── package.json
├── contracts/               # Smart contracts
│   ├── contracts/           # Solidity contracts
│   ├── scripts/             # Deployment scripts
│   ├── test/                # Contract tests
│   └── hardhat.config.js
├── sdk/                     # TypeScript SDK
│   ├── src/                 # SDK source code
│   ├── examples/            # Usage examples
│   └── package.json
├── docs/                    # Documentation
├── infrastructure/          # Infrastructure as code
└── docker-compose.yml       # Development environment
```

---

## Development Environment

### Local Setup

#### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services included:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: PostgreSQL on port 5432
- **Redis**: Cache on port 6379
- **Blockchain**: Local Hardhat node on port 8545

#### Manual Setup

1. **Database Setup**
```bash
# Install PostgreSQL
# Create database
createdb yieldrails_dev

# Run migrations
npm run db:migrate

# Seed data
npm run db:seed
```

2. **Redis Setup**
```bash
# Install Redis
# Start Redis server
redis-server
```

3. **Blockchain Setup**
```bash
# Start local blockchain
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yieldrails_dev
REDIS_URL=redis://localhost:6379

# Blockchain
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
ARBITRUM_RPC_URL=https://arbitrum-mainnet.infura.io/v3/YOUR_PROJECT_ID

# API Keys
COINGECKO_API_KEY=your_coingecko_api_key
DEFIPULSE_API_KEY=your_defipulse_api_key

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key

# External Services
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Monitoring
SENTRY_DSN=your_sentry_dsn
PROMETHEUS_PORT=9090
```

#### Frontend (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Blockchain
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_INFURA_ID=your_infura_project_id

# Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token

# Features
NEXT_PUBLIC_ENABLE_MAINNET=false
NEXT_PUBLIC_ENABLE_TESTNET=true
```

---

## Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Ethereum)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web3 Wallet   │    │   Database      │    │   DeFi          │
│   (MetaMask)    │    │   (PostgreSQL)  │    │   Protocols     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Architecture

#### Layer Structure
1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Business logic and operations
3. **Models**: Data access and database operations
4. **Middleware**: Authentication, validation, logging
5. **Utils**: Helper functions and utilities

#### Key Services
- **AuthService**: User authentication and authorization
- **PortfolioService**: Portfolio management and tracking
- **YieldService**: Yield strategy calculations
- **BlockchainService**: Blockchain interaction
- **NotificationService**: Real-time notifications

### Frontend Architecture

#### Component Structure
```
components/
├── ui/                 # Basic UI components
├── forms/              # Form components
├── charts/             # Data visualization
├── layout/             # Layout components
├── portfolio/          # Portfolio-specific components
├── strategies/         # Strategy components
└── optimization/       # ML optimization components
```

#### State Management
- **Zustand**: Global state management
- **React Query**: Server state and caching
- **React Hook Form**: Form state management

### Database Schema

#### Core Tables
```sql
-- Users and Authentication
users (id, email, password_hash, created_at, updated_at)
user_profiles (user_id, first_name, last_name, country, kyc_status)
user_wallets (user_id, address, network, is_primary)

-- Portfolio Management
portfolios (id, user_id, name, total_value, created_at)
positions (id, portfolio_id, strategy_id, amount, shares, entry_price)
transactions (id, user_id, type, amount, status, tx_hash, created_at)

-- Yield Strategies
strategies (id, name, protocol, network, apy, risk_level, tvl)
strategy_performance (strategy_id, date, apy, tvl, price)

-- Analytics and Optimization
optimization_results (id, user_id, recommendations, confidence, created_at)
risk_assessments (id, portfolio_id, risk_score, metrics, assessed_at)
```

---

## API Integration

### Authentication

#### Obtain API Key
```javascript
// Register for API access
const response = await fetch('/api/auth/api-key', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + userToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Application',
    permissions: ['read', 'trade']
  })
});

const { apiKey } = await response.json();
```

#### Make Authenticated Requests
```javascript
const apiKey = 'your-api-key';

const response = await fetch('/api/portfolio', {
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  }
});

const portfolio = await response.json();
```

### Core API Usage Examples

#### Portfolio Management
```javascript
// Get portfolio overview
const portfolio = await fetch('/api/portfolio', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
}).then(res => res.json());

// Get positions
const positions = await fetch('/api/portfolio/positions', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
}).then(res => res.json());

// Create deposit
const deposit = await fetch('/api/deposits', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    strategyId: 'aave-usdc-lending',
    amount: 1000,
    asset: 'USDC'
  })
}).then(res => res.json());
```

#### Strategy Information
```javascript
// List available strategies
const strategies = await fetch('/api/strategies?riskLevel=low', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
}).then(res => res.json());

// Get strategy details
const strategy = await fetch('/api/strategies/aave-usdc-lending', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
}).then(res => res.json());
```

#### Optimization
```javascript
// Get optimization recommendations
const recommendations = await fetch('/api/optimization/recommendations?riskTolerance=moderate', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
}).then(res => res.json());

// Execute rebalancing
const rebalance = await fetch('/api/optimization/rebalance', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recommendations: recommendations.data.recommendations
  })
}).then(res => res.json());
```

### WebSocket Integration

#### Connection Setup
```javascript
const ws = new WebSocket('wss://api.yieldrails.com/v1/ws');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: apiKey
  }));
};

// Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'portfolio_update':
      updatePortfolioUI(message.data);
      break;
    case 'price_update':
      updatePrices(message.data);
      break;
  }
};
```

#### Subscriptions
```javascript
// Subscribe to portfolio updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'portfolio',
  params: { userId: 'user_123' }
}));

// Subscribe to price updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'prices',
  params: { assets: ['USDC', 'ETH', 'WBTC'] }
}));
```

---

## SDK Usage

### TypeScript SDK

#### Installation
```bash
npm install @yieldrails/sdk
# or
yarn add @yieldrails/sdk
```

#### Basic Usage
```typescript
import { YieldRailsClient } from '@yieldrails/sdk';

const client = new YieldRailsClient({
  apiKey: 'your-api-key',
  environment: 'production', // or 'staging'
  timeout: 30000
});

// Get portfolio
const portfolio = await client.portfolio.get();
console.log('Portfolio value:', portfolio.totalValue);

// List strategies
const strategies = await client.strategies.list({
  riskLevel: 'low',
  minApy: 0.05
});

// Create deposit
const deposit = await client.deposits.create({
  strategyId: 'aave-usdc-lending',
  amount: 1000,
  asset: 'USDC',
  slippage: 0.005
});

console.log('Deposit created:', deposit.id);
```

#### Advanced Features
```typescript
// Portfolio optimization
const recommendations = await client.optimization.getRecommendations({
  riskTolerance: 'moderate',
  timeHorizon: '30d'
});

// Execute rebalancing
const rebalance = await client.optimization.rebalance({
  recommendations: recommendations.recommendations,
  slippage: 0.005
});

// Real-time updates
client.subscribe('portfolio', (update) => {
  console.log('Portfolio updated:', update);
});

// Analytics
const performance = await client.analytics.getPerformance({
  period: '30d',
  benchmark: 'market'
});
```

#### Error Handling
```typescript
import { YieldRailsError, RateLimitError } from '@yieldrails/sdk';

try {
  const portfolio = await client.portfolio.get();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof YieldRailsError) {
    console.log('API error:', error.message, error.code);
  } else {
    console.log('Unexpected error:', error);
  }
}
```

### Python SDK

#### Installation
```bash
pip install yieldrails-python
```

#### Basic Usage
```python
from yieldrails import YieldRailsClient

client = YieldRailsClient(
    api_key='your-api-key',
    environment='production'
)

# Get portfolio
portfolio = client.portfolio.get()
print(f"Portfolio value: {portfolio['totalValue']}")

# List strategies
strategies = client.strategies.list(risk_level='low')

# Create deposit
deposit = client.deposits.create(
    strategy_id='aave-usdc-lending',
    amount=1000,
    asset='USDC'
)
```

---

## Smart Contract Integration

### Contract Addresses

#### Mainnet
```typescript
const contracts = {
  YieldRailsVault: '0x1234567890abcdef1234567890abcdef12345678',
  YieldOptimizer: '0xabcdef1234567890abcdef1234567890abcdef12',
  RiskManager: '0x567890abcdef1234567890abcdef1234567890ab',
  CrossChainBridge: '0xcdef1234567890abcdef1234567890abcdef1234'
};
```

#### Testnet (Goerli)
```typescript
const testnetContracts = {
  YieldRailsVault: '0x9876543210fedcba9876543210fedcba98765432',
  YieldOptimizer: '0xfedcba9876543210fedcba9876543210fedcba98',
  RiskManager: '0x543210fedcba9876543210fedcba9876543210fe',
  CrossChainBridge: '0x10fedcba9876543210fedcba9876543210fedcba'
};
```

### Contract ABIs

ABIs are available in the SDK:
```typescript
import { YieldRailsVaultABI } from '@yieldrails/sdk/contracts';
```

### Direct Contract Interaction

```typescript
import { ethers } from 'ethers';
import { YieldRailsVaultABI } from '@yieldrails/sdk/contracts';

// Setup provider and contract
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const vaultContract = new ethers.Contract(
  contracts.YieldRailsVault,
  YieldRailsVaultABI,
  signer
);

// Deposit into vault
const depositTx = await vaultContract.deposit(
  strategyId,
  ethers.utils.parseUnits(amount.toString(), decimals),
  { gasLimit: 300000 }
);

await depositTx.wait();

// Get user position
const position = await vaultContract.getPosition(userAddress, strategyId);
```

### Event Listening

```typescript
// Listen for deposit events
vaultContract.on('Deposit', (user, strategyId, amount, shares, event) => {
  console.log('Deposit event:', {
    user,
    strategyId,
    amount: ethers.utils.formatUnits(amount, 18),
    shares: ethers.utils.formatUnits(shares, 18),
    txHash: event.transactionHash
  });
});

// Listen for optimization events
optimizerContract.on('OptimizationExecuted', (portfolioId, oldAllocation, newAllocation) => {
  console.log('Portfolio optimized:', {
    portfolioId,
    oldAllocation,
    newAllocation
  });
});
```

---

## Testing

### Backend Testing

#### Unit Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- portfolio.service.test.ts

# Run with coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Test specific API endpoints
npm run test:integration -- api/portfolio
```

#### Test Structure
```typescript
// tests/services/portfolio.service.test.ts
import { PortfolioService } from '../../src/services/PortfolioService';
import { createTestUser, createTestPortfolio } from '../helpers';

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  let testUser: any;

  beforeEach(async () => {
    portfolioService = new PortfolioService();
    testUser = await createTestUser();
  });

  describe('getPortfolio', () => {
    it('should return portfolio with correct structure', async () => {
      const portfolio = await createTestPortfolio(testUser.id);
      
      const result = await portfolioService.getPortfolio(testUser.id);
      
      expect(result).toHaveProperty('totalValue');
      expect(result).toHaveProperty('positions');
      expect(result.totalValue).toBeGreaterThan(0);
    });
  });
});
```

### Frontend Testing

#### Component Tests
```bash
# Run component tests
npm run test:components

# Run with watch mode
npm run test:components -- --watch
```

#### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- portfolio.spec.ts
```

#### Test Example
```typescript
// tests/components/Portfolio.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Portfolio } from '../../src/components/Portfolio';
import { mockPortfolioData } from '../mocks';

describe('Portfolio Component', () => {
  it('displays portfolio value correctly', async () => {
    render(<Portfolio />);
    
    await waitFor(() => {
      expect(screen.getByText('$125,000.50')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<Portfolio />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### Smart Contract Testing

```bash
# Run contract tests
npx hardhat test

# Run specific test
npx hardhat test test/YieldVault.test.js

# Generate coverage
npx hardhat coverage
```

#### Contract Test Example
```javascript
// test/YieldVault.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('YieldVault', () => {
  let vault, owner, user1, usdc;

  beforeEach(async () => {
    [owner, user1] = await ethers.getSigners();
    
    const USDC = await ethers.getContractFactory('MockERC20');
    usdc = await USDC.deploy('USDC', 'USDC', 6);
    
    const YieldVault = await ethers.getContractFactory('YieldVault');
    vault = await YieldVault.deploy();
  });

  describe('Deposits', () => {
    it('should accept deposits and mint shares', async () => {
      const depositAmount = ethers.utils.parseUnits('1000', 6);
      
      await usdc.connect(user1).approve(vault.address, depositAmount);
      await vault.connect(user1).deposit('strategy1', depositAmount);
      
      const shares = await vault.getShares(user1.address, 'strategy1');
      expect(shares).to.be.gt(0);
    });
  });
});
```

---

## Deployment

### Backend Deployment

#### Production Build
```bash
# Build application
npm run build

# Start production server
npm start
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### Kubernetes Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yieldrails-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: yieldrails-backend
  template:
    metadata:
      labels:
        app: yieldrails-backend
    spec:
      containers:
      - name: backend
        image: yieldrails/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

### Frontend Deployment

#### Next.js Build
```bash
# Build for production
npm run build

# Start production server
npm start

# Export static site
npm run export
```

#### CDN Deployment
```bash
# Build and upload to S3/CloudFront
npm run build
aws s3 sync out/ s3://yieldrails-frontend --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Smart Contract Deployment

#### Hardhat Deployment
```javascript
// scripts/deploy.js
async function main() {
  const YieldVault = await ethers.getContractFactory('YieldVault');
  const vault = await YieldVault.deploy();
  
  await vault.deployed();
  console.log('YieldVault deployed to:', vault.address);
  
  // Verify on Etherscan
  await hre.run('verify:verify', {
    address: vault.address,
    constructorArguments: []
  });
}

main().catch(console.error);
```

```bash
# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Deploy to testnet
npx hardhat run scripts/deploy.js --network goerli
```

---

## Contributing

### Development Workflow

1. **Fork the Repository**
```bash
git clone https://github.com/your-username/yieldrails-platform.git
cd yieldrails-platform
git remote add upstream https://github.com/yieldrails/yieldrails-platform.git
```

2. **Create Feature Branch**
```bash
git checkout -b feature/new-optimization-algorithm
```

3. **Make Changes**
- Follow coding standards
- Add tests for new functionality
- Update documentation

4. **Test Changes**
```bash
npm test
npm run test:integration
npm run lint
```

5. **Submit Pull Request**
- Write clear commit messages
- Provide detailed PR description
- Reference related issues

### Coding Standards

#### TypeScript/JavaScript
```typescript
// Use TypeScript strict mode
// Follow ESLint configuration
// Use meaningful variable names

interface Portfolio {
  id: string;
  totalValue: number;
  positions: Position[];
}

class PortfolioService {
  async getPortfolio(userId: string): Promise<Portfolio> {
    // Implementation
  }
}
```

#### Solidity
```solidity
// Use Solidity 0.8.x
// Follow security best practices
// Add comprehensive comments

contract YieldVault {
    mapping(address => mapping(string => uint256)) private userShares;
    
    event Deposit(
        address indexed user,
        string indexed strategyId,
        uint256 amount,
        uint256 shares
    );
    
    function deposit(
        string calldata strategyId,
        uint256 amount
    ) external nonReentrant {
        // Implementation
    }
}
```

### Security Guidelines

1. **Input Validation**
   - Validate all user inputs
   - Use parameterized queries
   - Sanitize data before processing

2. **Authentication**
   - Use secure session management
   - Implement proper RBAC
   - Enable 2FA for sensitive operations

3. **Smart Contract Security**
   - Use OpenZeppelin libraries
   - Implement reentrancy protection
   - Add access controls

4. **API Security**
   - Rate limiting
   - Input validation
   - Secure error handling

---

## Best Practices

### Performance Optimization

#### Backend
- Use connection pooling for databases
- Implement caching strategies
- Optimize database queries
- Use async/await properly

#### Frontend
- Implement lazy loading
- Use React.memo for expensive components
- Optimize bundle size
- Cache API responses

#### Blockchain
- Batch transactions when possible
- Use multicall for reading data
- Implement gas optimization
- Cache blockchain data

### Security Best Practices

#### API Development
```typescript
// Input validation
import Joi from 'joi';

const depositSchema = Joi.object({
  strategyId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  asset: Joi.string().valid('USDC', 'USDT', 'DAI').required()
});

// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

#### Smart Contract Development
```solidity
// Use OpenZeppelin
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldVault is ReentrancyGuard, Ownable {
    // Implement checks-effects-interactions pattern
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Effects
        balances[msg.sender] -= amount;
        
        // Interactions
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

### Error Handling

#### API Error Responses
```typescript
// Standardized error format
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Error middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const error: APIError = {
    success: false,
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    },
    timestamp: new Date().toISOString()
  };
  
  res.status(getStatusCode(err)).json(error);
};
```

#### Frontend Error Boundaries
```typescript
// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

### Documentation Standards

- Use JSDoc for TypeScript/JavaScript
- Document all public APIs
- Provide usage examples
- Keep documentation up to date
- Use clear, concise language

```typescript
/**
 * Calculates the optimal portfolio allocation using ML algorithms
 * @param portfolioId - The unique identifier for the portfolio
 * @param riskTolerance - User's risk tolerance level
 * @param timeHorizon - Investment time horizon
 * @returns Promise resolving to optimization recommendations
 * @example
 * ```typescript
 * const recommendations = await optimizePortfolio(
 *   'portfolio_123',
 *   'moderate',
 *   '30d'
 * );
 * ```
 */
async function optimizePortfolio(
  portfolioId: string,
  riskTolerance: RiskTolerance,
  timeHorizon: TimeHorizon
): Promise<OptimizationResult> {
  // Implementation
}
```

---

## Resources

### Documentation
- **API Reference**: [docs.yieldrails.com/api](https://docs.yieldrails.com/api)
- **SDK Documentation**: [docs.yieldrails.com/sdk](https://docs.yieldrails.com/sdk)
- **Smart Contracts**: [docs.yieldrails.com/contracts](https://docs.yieldrails.com/contracts)

### Development Tools
- **Postman Collection**: Available for API testing
- **Hardhat**: For smart contract development
- **Graph Protocol**: For blockchain data indexing

### Community
- **GitHub**: [github.com/yieldrails](https://github.com/yieldrails)
- **Discord**: [discord.gg/yieldrails](https://discord.gg/yieldrails)
- **Developer Portal**: [dev.yieldrails.com](https://dev.yieldrails.com)

### Support
- **Technical Support**: dev-support@yieldrails.com
- **Bug Reports**: [github.com/yieldrails/issues](https://github.com/yieldrails/issues)
- **Feature Requests**: Use GitHub issues with enhancement label

---

Happy coding! 🚀