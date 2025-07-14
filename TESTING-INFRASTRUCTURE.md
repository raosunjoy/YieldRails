# YieldRails Testing Infrastructure

This document describes the comprehensive testing infrastructure implemented for the YieldRails project.

## Overview

The YieldRails testing infrastructure is designed to ensure 100% reliability and security through comprehensive test coverage across all components:

- **Smart Contracts**: 100% test coverage requirement
- **Backend Services**: 95% test coverage requirement  
- **Frontend Components**: 90% test coverage requirement
- **SDK**: 100% test coverage requirement

## Testing Architecture

### 1. Test Types

#### Unit Tests
- **Purpose**: Test individual functions and components in isolation
- **Location**: `*/test/unit/` or `*/__tests__/`
- **Coverage**: High coverage requirements per workspace
- **Execution**: Fast, no external dependencies

#### Integration Tests
- **Purpose**: Test component interactions and API endpoints
- **Location**: `*/test/integration/`
- **Dependencies**: Database, Redis, external services (mocked)
- **Execution**: Medium speed, isolated test environment

#### End-to-End Tests
- **Purpose**: Test complete user workflows
- **Location**: `*/test/e2e/`
- **Dependencies**: Full application stack
- **Execution**: Slower, realistic environment

### 2. Workspace-Specific Testing

#### Smart Contracts (`contracts/`)
```bash
# Run all contract tests
npm run test --workspace=contracts

# Run with coverage (100% required)
npm run test:coverage --workspace=contracts

# Run with gas reporting
npm run test:gas --workspace=contracts

# Run specific test categories
npm run test:unit --workspace=contracts
npm run test:integration --workspace=contracts
```

**Configuration**: `contracts/hardhat.config.js`
- Hardhat testing framework
- Mocha test runner
- Chai assertions
- Gas reporting enabled
- Coverage tracking with 100% requirement

**Test Structure**:
```
contracts/test/
├── unit/           # Unit tests for individual contracts
├── integration/    # Integration tests between contracts
├── helpers/        # Test utilities and fixtures
└── *.test.js       # Main test files
```

#### Backend API (`backend/`)
```bash
# Run all backend tests
npm run test --workspace=backend

# Run specific test types
npm run test:unit --workspace=backend
npm run test:integration --workspace=backend
npm run test:e2e --workspace=backend

# Run with coverage (95% required)
npm run test:coverage --workspace=backend
```

**Configuration**: Multiple Jest configs
- `jest.config.js` - Unit tests
- `jest.integration.config.js` - Integration tests
- `jest.e2e.config.js` - End-to-end tests

**Test Structure**:
```
backend/test/
├── unit/           # Unit tests for services/utilities
├── integration/    # API integration tests
├── e2e/           # End-to-end workflow tests
├── helpers/       # Test utilities and mocks
└── setup/         # Test environment setup
```

#### Frontend (`frontend/`)
```bash
# Run frontend tests
npm run test --workspace=frontend

# Run with coverage (90% required)
npm run test:coverage --workspace=frontend

# Run E2E tests with Playwright
npm run test:e2e --workspace=frontend
```

**Configuration**: `jest.config.js` with Next.js integration
- React Testing Library
- Jest DOM matchers
- Component testing focus
- Playwright for E2E tests

#### SDK (`sdk/`)
```bash
# Run SDK tests
npm run test --workspace=sdk

# Run with coverage (100% required)
npm run test:coverage --workspace=sdk
```

**Configuration**: `jest.config.js`
- TypeScript support
- Node.js environment
- Mock external dependencies
- 100% coverage requirement

### 3. Test Utilities and Helpers

#### Backend Test Utilities (`backend/test/helpers/testUtils.ts`)
- Mock Express request/response objects
- Database test utilities
- Blockchain mocking utilities
- API testing helpers
- Time manipulation utilities
- Error testing utilities

#### Contract Test Helpers (`contracts/test/helpers/index.js`)
- Contract deployment utilities
- Time manipulation (EVM)
- Gas measurement tools
- Event testing utilities
- Balance tracking
- Yield calculation helpers

### 4. Quality Gates

#### Coverage Requirements
- **Contracts**: 100% (statements, branches, functions, lines)
- **Backend**: 95% (statements, branches, functions, lines)
- **Frontend**: 90% (statements, branches, functions, lines)
- **SDK**: 100% (statements, branches, functions, lines)

#### Performance Requirements
- **Gas Usage**: <100k gas per contract transaction
- **API Response Time**: <200ms (95th percentile)
- **Bundle Size**: Frontend <500KB, SDK <50KB

#### Security Requirements
- All inputs validated and sanitized
- Comprehensive error handling
- Security audit integration
- Dependency vulnerability scanning

### 5. Continuous Integration

#### GitHub Actions Pipeline (`.github/workflows/ci.yml`)

**Stages**:
1. **Lint & Format**: Code quality checks
2. **Unit Tests**: Parallel execution across workspaces
3. **Integration Tests**: Database and service integration
4. **Contract Tests**: Smart contract testing with coverage
5. **E2E Tests**: Full application workflow testing
6. **Security Audit**: Vulnerability scanning
7. **Build & Deploy**: Docker image creation and deployment

**Quality Gates Validation**:
- Coverage thresholds enforced
- Gas usage limits checked
- Bundle size limits verified
- Security audit results reviewed

### 6. Local Development

#### Running Tests Locally

```bash
# Install all dependencies
npm run install:all

# Run all tests across workspaces
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run quality gates validation
npm run quality:gates
```

#### Test Environment Setup

**Prerequisites**:
- Node.js 18+
- PostgreSQL (for integration tests)
- Redis (for integration tests)
- Docker (optional, for containerized testing)

**Environment Variables**:
```bash
# Test database
DATABASE_URL=postgresql://test:test@localhost:5432/yieldrails_test

# Test Redis
REDIS_URL=redis://localhost:6379/1

# Test JWT secret
JWT_SECRET=test-jwt-secret-key

# Log level for tests
LOG_LEVEL=error
```

### 7. Test Data Management

#### Database Testing
- Separate test databases for each test type
- Automatic cleanup between tests
- Seeding utilities for consistent test data
- Transaction rollback for test isolation

#### Blockchain Testing
- Hardhat local network for contract tests
- Snapshot/restore for test isolation
- Mock contracts for integration testing
- Gas usage tracking and optimization

### 8. Debugging and Troubleshooting

#### Common Issues

**Coverage Not Meeting Requirements**:
```bash
# Check detailed coverage report
npm run test:coverage --workspace=<workspace>
open <workspace>/coverage/index.html
```

**Integration Tests Failing**:
```bash
# Check database connection
npm run db:migrate --workspace=backend

# Verify Redis connection
redis-cli ping
```

**Contract Tests Gas Issues**:
```bash
# Run with gas reporting
REPORT_GAS=true npm run test --workspace=contracts

# Check gas report
cat contracts/gas-report.txt
```

#### Test Debugging
- Use `--verbose` flag for detailed output
- Set `LOG_LEVEL=debug` for detailed logging
- Use `--watch` mode for development
- Leverage IDE debugging with Jest/Mocha

### 9. Best Practices

#### Writing Tests
1. **Arrange-Act-Assert** pattern
2. **Descriptive test names** explaining the scenario
3. **Test edge cases** and error conditions
4. **Mock external dependencies** appropriately
5. **Use test utilities** for common operations

#### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for setup/cleanup
3. **Keep tests independent** and isolated
4. **Follow naming conventions** consistently

#### Performance
1. **Parallel test execution** where possible
2. **Efficient test data setup**
3. **Proper cleanup** to prevent memory leaks
4. **Optimize slow tests** or mark as integration/E2E

### 10. Monitoring and Reporting

#### Coverage Reporting
- HTML reports for detailed analysis
- LCOV format for CI integration
- Codecov integration for PR reviews
- Coverage trends tracking

#### Performance Monitoring
- Gas usage tracking for contracts
- Response time monitoring for APIs
- Bundle size monitoring for frontend
- Memory usage tracking for long-running tests

#### Quality Metrics
- Test execution time trends
- Flaky test identification
- Coverage trend analysis
- Security vulnerability tracking

## Conclusion

This comprehensive testing infrastructure ensures the reliability, security, and performance of the YieldRails platform. The multi-layered approach with strict quality gates provides confidence in the system's robustness while maintaining development velocity through automated testing and continuous integration.