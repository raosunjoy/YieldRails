/**
 * YieldRails SDK - Main entry point
 */

// Main SDK class
import { YieldRailsSDK } from './yieldrails-sdk';
export { YieldRailsSDK };

// Client classes
export { ApiClient } from './client/api-client';
export { WebSocketClient } from './client/websocket-client';

// Service classes
export { AuthService } from './services/auth';
export { PaymentService } from './services/payment';
export { YieldService } from './services/yield';
export { CrossChainService } from './services/crosschain';
export { ComplianceService } from './services/compliance';
export { ExternalService } from './services/external';

// Blockchain helpers
export { ContractHelper } from './blockchain/contract-helper';
export { YieldRailsContracts } from './blockchain/yieldrails-contracts';
export { 
  getDeploymentConfig,
  getAllContractAddresses,
  getContractAddress,
  isContractDeployed,
  isContractVerified,
  getDeploymentInfo,
  getSupportedNetworks,
  getMainnetNetworks,
  getTestnetNetworks,
  chainNameToNetwork,
  getBlockExplorerUrl,
  getTransactionUrl,
  getContractUrl,
} from './blockchain/deployment-config';

// Types
export * from './types';

// Re-export commonly used types for convenience
export type {
  SDKConfig,
  WebSocketConfig,
  ApiResponse,
  PaginatedResponse,
} from './types/common';

// Re-export enums and classes as values
export {
  YieldRailsError,
  ChainName,
  TokenSymbol,
} from './types/common';

export type {
  Payment,
  CreatePaymentRequest,
  PaymentStatus,
  PaymentType,
  PaymentAnalytics,
} from './types/payment';

export type {
  YieldStrategy,
  YieldEarning,
  YieldOptimizationRequest,
  YieldOptimizationResponse,
  YieldPerformanceMetrics,
} from './types/yield';

export type {
  AuthResponse,
  User,
  LoginRequest,
  RegisterRequest,
} from './types/auth';

export type {
  BridgeTransaction,
  BridgeRequest,
  BridgeEstimate,
  BridgeStatus,
} from './types/crosschain';

// Default export
export { YieldRailsSDK as default };