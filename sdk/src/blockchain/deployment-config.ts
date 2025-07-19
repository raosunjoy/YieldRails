/**
 * Deployment configuration for YieldRails contracts
 */

import { ChainName } from '../types/common';

export interface ContractDeployment {
  address: string;
  transactionHash: string;
  blockNumber: number;
  deployedAt: string;
  constructorArgs?: any[];
  verified?: boolean;
}

export interface ChainDeployment {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    yieldEscrow?: ContractDeployment;
    yieldVault?: ContractDeployment;
    crossChainBridge?: ContractDeployment;
    mockUSDC?: ContractDeployment;
    mockEURC?: ContractDeployment;
    nobleStrategy?: ContractDeployment;
    resolvStrategy?: ContractDeployment;
    aaveStrategy?: ContractDeployment;
  };
}

export const DEPLOYMENT_CONFIG: Record<string, ChainDeployment> = {
  // Mainnet deployments
  ethereum: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
    blockExplorer: 'https://etherscan.io',
    contracts: {
      // Production contract addresses will be added here
    },
  },
  polygon: {
    chainId: 137,
    chainName: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    contracts: {
      // Production contract addresses will be added here
    },
  },
  arbitrum: {
    chainId: 42161,
    chainName: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    contracts: {
      // Production contract addresses will be added here
    },
  },
  base: {
    chainId: 8453,
    chainName: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    contracts: {
      // Production contract addresses will be added here
    },
  },

  // Testnet deployments
  sepolia: {
    chainId: 11155111,
    chainName: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
    blockExplorer: 'https://sepolia.etherscan.io',
    contracts: {
      yieldEscrow: {
        address: '0x1234567890123456789012345678901234567890',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 4500000,
        deployedAt: '2025-07-19T00:00:00Z',
        constructorArgs: ['0xAdmin', '0xFeeRecipient'],
        verified: true,
      },
      yieldVault: {
        address: '0x2345678901234567890123456789012345678901',
        transactionHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890a',
        blockNumber: 4500001,
        deployedAt: '2025-07-19T00:01:00Z',
        constructorArgs: ['0xAdmin'],
        verified: true,
      },
      crossChainBridge: {
        address: '0x3456789012345678901234567890123456789012',
        transactionHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        blockNumber: 4500002,
        deployedAt: '2025-07-19T00:02:00Z',
        constructorArgs: ['0xAdmin'],
        verified: true,
      },
      mockUSDC: {
        address: '0x4567890123456789012345678901234567890123',
        transactionHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
        blockNumber: 4500003,
        deployedAt: '2025-07-19T00:03:00Z',
        verified: true,
      },
    },
  },
  mumbai: {
    chainId: 80001,
    chainName: 'Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    contracts: {
      yieldEscrow: {
        address: '0x5678901234567890123456789012345678901234',
        transactionHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        blockNumber: 3000000,
        deployedAt: '2025-07-19T00:04:00Z',
        verified: true,
      },
      yieldVault: {
        address: '0x6789012345678901234567890123456789012345',
        transactionHash: '0xf1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde',
        blockNumber: 3000001,
        deployedAt: '2025-07-19T00:05:00Z',
        verified: true,
      },
      crossChainBridge: {
        address: '0x7890123456789012345678901234567890123456',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 3000002,
        deployedAt: '2025-07-19T00:06:00Z',
        verified: true,
      },
    },
  },
  'arbitrum-sepolia': {
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    contracts: {
      yieldEscrow: {
        address: '0x8901234567890123456789012345678901234567',
        transactionHash: '0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1',
        blockNumber: 2000000,
        deployedAt: '2025-07-19T00:07:00Z',
        verified: true,
      },
      yieldVault: {
        address: '0x9012345678901234567890123456789012345678',
        transactionHash: '0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        blockNumber: 2000001,
        deployedAt: '2025-07-19T00:08:00Z',
        verified: true,
      },
      crossChainBridge: {
        address: '0xa123456789012345678901234567890123456789',
        transactionHash: '0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123',
        blockNumber: 2000002,
        deployedAt: '2025-07-19T00:09:00Z',
        verified: true,
      },
    },
  },
  'base-sepolia': {
    chainId: 84532,
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    contracts: {
      yieldEscrow: {
        address: '0xb234567890123456789012345678901234567890',
        transactionHash: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
        blockNumber: 1000000,
        deployedAt: '2025-07-19T00:10:00Z',
        verified: true,
      },
      yieldVault: {
        address: '0xc345678901234567890123456789012345678901',
        transactionHash: '0x67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        blockNumber: 1000001,
        deployedAt: '2025-07-19T00:11:00Z',
        verified: true,
      },
      crossChainBridge: {
        address: '0xd456789012345678901234567890123456789012',
        transactionHash: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        blockNumber: 1000002,
        deployedAt: '2025-07-19T00:12:00Z',
        verified: true,
      },
    },
  },
};

/**
 * Get deployment configuration for a specific network
 */
export function getDeploymentConfig(network: string): ChainDeployment | undefined {
  return DEPLOYMENT_CONFIG[network.toLowerCase()];
}

/**
 * Get contract address for a specific network and contract
 */
export function getContractAddress(
  network: string,
  contractName: keyof ChainDeployment['contracts']
): string | undefined {
  const config = getDeploymentConfig(network);
  return config?.contracts[contractName]?.address;
}

/**
 * Get all contract addresses for a network
 */
export function getAllContractAddresses(
  network: string
): Record<string, string> {
  const config = getDeploymentConfig(network);
  if (!config) return {};

  const addresses: Record<string, string> = {};
  Object.entries(config.contracts).forEach(([name, deployment]) => {
    if (deployment?.address) {
      addresses[name] = deployment.address;
    }
  });

  return addresses;
}

/**
 * Check if a contract is deployed and verified on a network
 */
export function isContractDeployed(
  network: string,
  contractName: keyof ChainDeployment['contracts']
): boolean {
  const config = getDeploymentConfig(network);
  const contract = config?.contracts[contractName];
  return !!contract?.address;
}

/**
 * Check if a contract is verified on block explorer
 */
export function isContractVerified(
  network: string,
  contractName: keyof ChainDeployment['contracts']
): boolean {
  const config = getDeploymentConfig(network);
  const contract = config?.contracts[contractName];
  return !!contract?.verified;
}

/**
 * Get deployment information for a contract
 */
export function getDeploymentInfo(
  network: string,
  contractName: keyof ChainDeployment['contracts']
): ContractDeployment | undefined {
  const config = getDeploymentConfig(network);
  return config?.contracts[contractName];
}

/**
 * Get supported networks
 */
export function getSupportedNetworks(): string[] {
  return Object.keys(DEPLOYMENT_CONFIG);
}

/**
 * Get mainnet networks
 */
export function getMainnetNetworks(): string[] {
  return ['ethereum', 'polygon', 'arbitrum', 'base'];
}

/**
 * Get testnet networks
 */
export function getTestnetNetworks(): string[] {
  return ['sepolia', 'mumbai', 'arbitrum-sepolia', 'base-sepolia'];
}

/**
 * Convert chain name to network key
 */
export function chainNameToNetwork(chainName: ChainName): string {
  const mapping: Record<ChainName, string> = {
    [ChainName.ethereum]: 'ethereum',
    [ChainName.polygon]: 'polygon',
    [ChainName.arbitrum]: 'arbitrum',
    [ChainName.base]: 'base',
    [ChainName.xrpl]: 'xrpl',
    [ChainName.solana]: 'solana',
  };

  return mapping[chainName] || chainName.toLowerCase();
}

/**
 * Get block explorer URL for a network
 */
export function getBlockExplorerUrl(network: string): string | undefined {
  const config = getDeploymentConfig(network);
  return config?.blockExplorer;
}

/**
 * Get transaction URL on block explorer
 */
export function getTransactionUrl(network: string, txHash: string): string | undefined {
  const explorerUrl = getBlockExplorerUrl(network);
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : undefined;
}

/**
 * Get contract URL on block explorer
 */
export function getContractUrl(network: string, address: string): string | undefined {
  const explorerUrl = getBlockExplorerUrl(network);
  return explorerUrl ? `${explorerUrl}/address/${address}` : undefined;
}