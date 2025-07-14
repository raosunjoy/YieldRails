# YieldRails Testing Infrastructure

This document describes the comprehensive testing infrastructure implemented for the YieldRails platform, ensuring 100% smart contract coverage and 95% backend coverage with automated quality gates.

## Overview

The YieldRails testing infrastructure is designed to support:
- **Smart Contracts**: 100% test coverage requirement with gas optimization validation
- **Backend Services**: 95% test coverage with integration and E2E testing
- **Frontend Applications**: Component testing with React Testing Library
- **SDK**: Comprehensive API testing with mock integrations
- **CI/CD Pipeline**: Automated testing and quality gate validation

## Project Structure

```
yieldrails/
├── contracts/                 # Smart contract testing
│   ├── test/
│   │   ├── helpers/           # Contract test utilities
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   └── infrastructure.test.js
│   ├── hardhat.config.js      # Hardhat configuration
│   └── coverage/              # Coverage reports
├── backend/                   # Backend API testing
│   ├── test/
│   │   ├── helpers/           # Test utilities
│   │   ├── setup/             # Test environment setup
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   └── e2e/               # End-to-end tests
│   ├── jest.config.js         # Jest configuration
│   └── coverage/              # Coverage reports
├── frontend/                  # Frontend testing
│   ├── test/
│   └── jest.config.js
├── sdk/                       # SDK testing
│   ├── test/
│   └── jest.config.js
├── scripts/
│   └── validate-quality-gates.js
└── .github/workflows/
    └── ci.yml                 # CI/CD pipeline
```

## Smart Contract Testing

### Configuration

The smart contract testing uses Hardhat with the following key configurations:

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  gasReporter: {
    enabled: true,
    outputFile: "./gas-report.txt",
    maxMethodDiff: 10
  },
  solidity_coverage: {
    skipFiles: ['test/', 'mocks/', 'interfaces/']
  }
};
```

### Test Helpers

The contract test helpers provide utilities for:
- Account setup and management
- Mock token and strategy deployment
- Gas usage measurement and validation
- Event detection and validation
- Time manipulation for testing
- Snapshot creation and restoration

```javascript
const { contractTestHelper, expectGasUsage, expectEvent } = require("./helpers");

// Example usage
const accounts = await contractTestHelper.setupAccounts();
const { usdc } = await contractTestHelper.deployMockTokens();
await expectGasUsage(tx, 100000); // Enforce 100k gas limit
```

### Coverage Requirements

- **100% line coverage** - Every line of code must be executed
- **100% function coverage** - Every function must be called
- **100% branch coverage** - Every conditional branch must be tested
- **100% statement coverage** - Every statement must be executed

### Gas Optimization

- Maximum 100k gas per transaction
- Gas reporting enabled for all tests
- Automatic validation in CI/CD pipeline

## Backend Testing

### Configuration

Backend testing uses Jest with TypeScript support:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
```

### Test Types

1. **Unit Tests** (`test/unit/`)
   - Individual function testing
   - Service method validation
   - Business logic verification

2. **Integration Tests** (`test/integration/`)
   - Database interactions
   - External service integrations
   - API endpoint testing

3. **End-to-End Tests** (`test/e2e/`)
   - Complete user workflows
   - Cross-service interactions
   - Real-world scenarios

### Test Utilities

The `testUtils` class provides comprehensive testing utilities:

```typescript
import { testUtils } from './helpers/testUtils';

// Database management
await testUtils.cleanup();
await testUtils.cleanDatabase();
await testUtils.cleanRedis();

// Test data creation
const user = testUtils.createTestUser({ role: 'MERCHANT' });
const payment = testUtils.createTestPayment({ amount: '100.00' });
const merchant = testUtils.createTestMerchant({ isActive: true });

// JWT and authentication
const token = testUtils.generateTestJWT('user-id', 'USER');
const headers = testUtils.createAuthHeaders(token);

// Blockchain utilities
const txHash = testUtils.generateMockTransactionHash();
const address = testUtils.generateMockWalletAddress();
```

### Database Testing

- PostgreSQL test databases for isolation
- Redis test instances for caching tests
- Automatic cleanup between tests
- Migration management for test environments

## CI/CD Pipeline

### Quality Gates

The CI/CD pipeline enforces strict quality gates:

1. **Linting and Formatting**
   - ESLint for code quality
   - Prettier for code formatting
   - Solhint for Solidity contracts

2. **Unit Tests**
   - All workspaces tested in parallel
   - Coverage reports generated
   - Failure stops pipeline

3. **Integration Tests**
   - Database and Redis services
   - External service mocking
   - Real integration validation

4. **Smart Contract Tests**
   - 100% coverage enforcement
   - Gas optimization validation
   - Security analysis

5. **End-to-End Tests**
   - Complete user workflows
   - Cross-service validation
   - Performance testing

6. **Security Audits**
   - npm audit for dependencies
   - Contract security analysis
   - Vulnerability scanning

### Pipeline Stages

```yaml
# .github/workflows/ci.yml
jobs:
  lint:           # Code quality checks
  test-unit:      # Unit tests for all workspaces
  test-integration: # Integration tests with services
  test-contracts: # Smart contract tests with 100% coverage
  test-e2e:       # End-to-end testing
  security:       # Security audits
  quality-gates:  # Quality gate validation
  build:          # Docker image building
  deploy-staging: # Staging deployment
  deploy-production: # Production deployment
```

## Quality Gate Validation

The `validate-quality-gates.js` script enforces all requirements:

```bash
npm run quality:gates
```

This validates:
- Smart contract 100% coverage
- Backend 95% coverage
- Gas usage limits (<100k per transaction)
- Contract size limits
- Security audit results

## Running Tests

### Smart Contracts

```bash
# Run all contract tests
npm run test --workspace=contracts

# Run with coverage
npm run test:coverage --workspace=contracts

# Run with gas reporting
npm run test:gas --workspace=contracts

# Run specific test file
npx hardhat test test/infrastructure.test.js
```

### Backend

```bash
# Run all backend tests
npm run test --workspace=backend

# Run unit tests only
npm run test:unit --workspace=backend

# Run integration tests
npm run test:integration --workspace=backend

# Run E2E tests
npm run test:e2e --workspace=backend

# Run with coverage
npm run test:coverage --workspace=backend

# Watch mode
npm run test:watch --workspace=backend
```

### All Workspaces

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Validate quality gates
npm run quality:gates
```

## Test Environment Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (for CI/CD)

### Local Development

1. **Install Dependencies**
   ```bash
   npm ci
   ```

2. **Setup Test Databases**
   ```bash
   # PostgreSQL
   createdb yieldrails_test
   createdb yieldrails_integration_test
   createdb yieldrails_e2e_test
   
   # Redis - uses different DB numbers (1, 2, 3)
   ```

3. **Environment Variables**
   ```bash
   # .env.test
   DATABASE_URL=postgresql://test:test@localhost:5432/yieldrails_test
   REDIS_URL=redis://localhost:6379/1
   JWT_SECRET=test-jwt-secret
   LOG_LEVEL=error
   ```

4. **Run Tests**
   ```bash
   npm run test
   ```

## Coverage Reports

### Smart Contracts

Coverage reports are generated in `contracts/coverage/`:
- `index.html` - Interactive HTML report
- `lcov.info` - LCOV format for CI/CD
- `coverage-summary.json` - JSON summary

### Backend

Coverage reports are generated in `backend/coverage/`:
- `index.html` - Interactive HTML report
- `lcov.info` - LCOV format for CI/CD
- `coverage-summary.json` - JSON summary

## Best Practices

### Test Organization

1. **Descriptive Test Names**
   ```javascript
   describe('PaymentService', () => {
     describe('createPayment', () => {
       it('should create payment with valid data', async () => {
         // Test implementation
       });
       
       it('should reject payment with invalid amount', async () => {
         // Test implementation
       });
     });
   });
   ```

2. **Test Isolation**
   ```javascript
   beforeEach(async () => {
     await testUtils.cleanup();
   });
   ```

3. **Comprehensive Assertions**
   ```javascript
   expect(payment).toHaveProperty('id');
   expect(payment.amount).toBe('100.00');
   expect(payment.status).toBe('PENDING');
   expect(testUtils.isValidEthereumAddress(payment.senderAddress)).toBe(true);
   ```

### Mock Management

1. **External Services**
   ```javascript
   jest.mock('ethers', () => ({
     JsonRpcProvider: jest.fn().mockImplementation(() => ({
       getBalance: jest.fn().mockResolvedValue('1000000000000000000')
     }))
   }));
   ```

2. **Database Interactions**
   ```javascript
   const mockUser = testUtils.createTestUser();
   await testUtils.createUserInDb(mockUser);
   ```

### Performance Testing

1. **Gas Usage Validation**
   ```javascript
   await expectGasUsage(tx, 100000);
   ```

2. **Response Time Testing**
   ```javascript
   const start = Date.now();
   await apiCall();
   const duration = Date.now() - start;
   expect(duration).toBeLessThan(200); // 200ms limit
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check connection strings
   - Verify test databases exist

2. **Redis Connection Errors**
   - Ensure Redis is running
   - Check Redis URL configuration
   - Verify different DB numbers for test isolation

3. **Coverage Failures**
   - Check excluded files in configuration
   - Ensure all code paths are tested
   - Review coverage reports for missing areas

4. **Gas Limit Exceeded**
   - Optimize contract code
   - Review gas usage reports
   - Consider contract size limits

### Debug Commands

```bash
# Debug test failures
npm run test -- --verbose

# Debug coverage issues
npm run test:coverage -- --verbose

# Debug gas usage
REPORT_GAS=true npm run test --workspace=contracts

# Debug database issues
DATABASE_URL=postgresql://... npm run test:integration --workspace=backend
```

## Continuous Improvement

The testing infrastructure is continuously improved through:

1. **Regular Updates**
   - Dependency updates
   - Security patches
   - Performance optimizations

2. **Metrics Tracking**
   - Coverage trends
   - Test execution time
   - Failure rates

3. **Tool Evaluation**
   - New testing frameworks
   - Better assertion libraries
   - Enhanced reporting tools

This comprehensive testing infrastructure ensures the YieldRails platform maintains the highest quality standards while enabling rapid, confident development and deployment.