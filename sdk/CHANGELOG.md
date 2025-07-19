# Changelog

All notable changes to the YieldRails SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-07-19

### Added - Task 35: Complete External Service Integrations
- **External Service Integration**: Complete integration with external DeFi protocols
  - Noble Protocol integration for T-bill yield strategies with real-time pool data
  - Resolv Protocol integration for delta-neutral DeFi strategies with risk metrics
  - Aave Protocol integration for lending yield strategies with market analytics
  - Circle CCTP integration for cross-chain USDC transfers with fee estimation
- **Service Health Monitoring**: Real-time health checks for all external services
  - Circuit breaker pattern implementation for automatic failover
  - Latency tracking and performance monitoring
  - Service availability status with error reporting
- **New ExternalService Class** with comprehensive API coverage:
  - `getServiceHealth()` - Monitor external service status and performance
  - `getNoblePools()` - Access T-bill investment pools with real-time APY
  - `getResolvVaults()` - Access delta-neutral vaults with risk analytics
  - `getAaveMarkets()` - Access lending markets with supply/borrow rates
  - `getCircleSupportedChains()` - Cross-chain transfer capabilities
  - Circuit breaker monitoring and reset capabilities
- **Enhanced YieldService**: Real-time APY data integration from external protocols
- **Comprehensive Examples**: `external-services-usage.ts` with practical integration patterns

### Enhanced
- **Real-time Data Integration**: Yield strategies now include live APY data from Noble, Resolv, and Aave
- **Service Reliability**: Circuit breaker pattern with automatic failover and recovery
- **Error Handling**: Comprehensive fallback mechanisms and graceful degradation
- **Type Safety**: Complete TypeScript definitions for all external service APIs
- **Health Monitoring**: Backend health endpoints enhanced with external service status

### Technical Improvements
- ExternalServiceManager class for centralized service management
- Automatic retry logic with exponential backoff
- Service health checks with configurable intervals
- Comprehensive mock data for development and testing
- Enhanced logging for service interactions and failures

## [0.3.0] - 2025-07-19

### Added - Task 33: Complete TypeScript SDK Development
- **YieldRailsContracts**: Comprehensive contract interaction helpers
  - Direct contract method calls for YieldEscrow, YieldVault, and CrossChainBridge
  - Real-time blockchain event listeners with filtering
  - Contract deployment configuration management
  - Gas estimation for contract operations
  - Transaction monitoring and confirmation
- **Deployment Configuration System**
  - Pre-configured contract addresses for all supported networks
  - Network-specific deployment information and block explorer integration
  - Contract verification status tracking
  - Support for mainnet and testnet environments
- **Enhanced SDK Integration**
  - High-level methods for on-chain payment operations
  - Real-time yield calculation from blockchain
  - Direct bridge transaction initiation
  - Blockchain event subscription management
- **Comprehensive Documentation**
  - Complete API reference with code examples
  - Blockchain integration guide with wallet connection
  - Usage examples for all major workflows
  - Developer-friendly documentation with practical scenarios
- **Enhanced Testing Suite**
  - Unit tests for YieldRailsContracts functionality
  - Integration tests for deployment configuration
  - Mock testing infrastructure for blockchain interactions
  - Comprehensive test coverage for all new features

### Changed
- Enhanced main SDK class with comprehensive blockchain integration
- Improved contract helper with YieldRails-specific functionality
- Updated examples to demonstrate advanced blockchain interactions
- Enhanced error handling for contract operations
- Improved TypeScript type safety for blockchain operations

### Technical Improvements
- Contract address management with automatic initialization
- Support for multiple blockchain networks (Ethereum, Polygon, Arbitrum, Base)
- Real-time event listening with proper cleanup
- Gas optimization and transaction monitoring
- Comprehensive deployment tracking and verification

## [0.2.0] - 2025-07-19

### Added
- Blockchain interaction helpers for contract calls
- ContractHelper class for managing blockchain interactions
- Support for initializing and interacting with smart contracts
- Wallet connection functionality
- Gas estimation and transaction management
- Block explorer URL generation
- Comprehensive blockchain interaction examples
- Enhanced WebSocket client for real-time updates
- Complete API endpoint coverage
- Improved TypeScript types for blockchain interactions
- Comprehensive documentation with code examples

### Changed
- Updated main SDK class to integrate blockchain helpers
- Enhanced error handling for blockchain operations
- Improved WebSocket reconnection logic
- Updated examples with blockchain interaction patterns

### Fixed
- WebSocket connection stability issues
- Type definitions for API responses
- Error handling in batch operations

## [0.1.0] - 2025-07-01

### Added
- Initial SDK release
- Core API client with authentication
- Payment service for creating and managing payments
- Yield service for strategy management and optimization
- Cross-chain service for bridge operations
- Compliance service for KYC/AML
- WebSocket client for real-time updates
- Comprehensive TypeScript type definitions
- Basic examples and documentation