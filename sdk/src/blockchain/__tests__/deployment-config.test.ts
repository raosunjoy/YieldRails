/**
 * Tests for deployment configuration utilities
 */

import {
  getDeploymentConfig,
  getContractAddress,
  getAllContractAddresses,
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
} from '../deployment-config';
import { ChainName } from '../../types/common';

describe('Deployment Configuration', () => {
  describe('getDeploymentConfig', () => {
    it('should return deployment config for valid network', () => {
      const config = getDeploymentConfig('sepolia');
      
      expect(config).toBeDefined();
      expect(config?.chainId).toBe(11155111);
      expect(config?.chainName).toBe('Sepolia Testnet');
      expect(config?.blockExplorer).toBe('https://sepolia.etherscan.io');
    });

    it('should return undefined for invalid network', () => {
      const config = getDeploymentConfig('invalid-network');
      expect(config).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const config1 = getDeploymentConfig('SEPOLIA');
      const config2 = getDeploymentConfig('sepolia');
      
      expect(config1).toEqual(config2);
    });
  });

  describe('getContractAddress', () => {
    it('should return contract address for valid network and contract', () => {
      const address = getContractAddress('sepolia', 'yieldEscrow');
      
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return undefined for invalid network', () => {
      const address = getContractAddress('invalid-network', 'yieldEscrow');
      expect(address).toBeUndefined();
    });

    it('should return undefined for invalid contract', () => {
      const address = getContractAddress('sepolia', 'invalidContract' as any);
      expect(address).toBeUndefined();
    });
  });

  describe('getAllContractAddresses', () => {
    it('should return all contract addresses for valid network', () => {
      const addresses = getAllContractAddresses('sepolia');
      
      expect(addresses).toEqual({
        yieldEscrow: '0x1234567890123456789012345678901234567890',
        yieldVault: '0x2345678901234567890123456789012345678901',
        crossChainBridge: '0x3456789012345678901234567890123456789012',
        mockUSDC: '0x4567890123456789012345678901234567890123',
      });
    });

    it('should return empty object for invalid network', () => {
      const addresses = getAllContractAddresses('invalid-network');
      expect(addresses).toEqual({});
    });

    it('should filter out undefined addresses', () => {
      const addresses = getAllContractAddresses('ethereum'); // Mainnet has no deployed contracts in config
      expect(addresses).toEqual({});
    });
  });

  describe('isContractDeployed', () => {
    it('should return true for deployed contract', () => {
      const isDeployed = isContractDeployed('sepolia', 'yieldEscrow');
      expect(isDeployed).toBe(true);
    });

    it('should return false for non-deployed contract', () => {
      const isDeployed = isContractDeployed('ethereum', 'yieldEscrow');
      expect(isDeployed).toBe(false);
    });

    it('should return false for invalid network', () => {
      const isDeployed = isContractDeployed('invalid-network', 'yieldEscrow');
      expect(isDeployed).toBe(false);
    });
  });

  describe('isContractVerified', () => {
    it('should return true for verified contract', () => {
      const isVerified = isContractVerified('sepolia', 'yieldEscrow');
      expect(isVerified).toBe(true);
    });

    it('should return false for non-verified contract', () => {
      const isVerified = isContractVerified('ethereum', 'yieldEscrow');
      expect(isVerified).toBe(false);
    });

    it('should return false for invalid network', () => {
      const isVerified = isContractVerified('invalid-network', 'yieldEscrow');
      expect(isVerified).toBe(false);
    });
  });

  describe('getDeploymentInfo', () => {
    it('should return deployment info for valid contract', () => {
      const info = getDeploymentInfo('sepolia', 'yieldEscrow');
      
      expect(info).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 4500000,
        deployedAt: '2025-07-19T00:00:00Z',
        constructorArgs: ['0xAdmin', '0xFeeRecipient'],
        verified: true,
      });
    });

    it('should return undefined for invalid contract', () => {
      const info = getDeploymentInfo('sepolia', 'invalidContract' as any);
      expect(info).toBeUndefined();
    });
  });

  describe('getSupportedNetworks', () => {
    it('should return array of supported networks', () => {
      const networks = getSupportedNetworks();
      
      expect(networks).toContain('ethereum');
      expect(networks).toContain('polygon');
      expect(networks).toContain('arbitrum');
      expect(networks).toContain('base');
      expect(networks).toContain('sepolia');
      expect(networks).toContain('mumbai');
      expect(networks).toContain('arbitrum-sepolia');
      expect(networks).toContain('base-sepolia');
    });
  });

  describe('getMainnetNetworks', () => {
    it('should return only mainnet networks', () => {
      const networks = getMainnetNetworks();
      
      expect(networks).toEqual(['ethereum', 'polygon', 'arbitrum', 'base']);
    });
  });

  describe('getTestnetNetworks', () => {
    it('should return only testnet networks', () => {
      const networks = getTestnetNetworks();
      
      expect(networks).toEqual(['sepolia', 'mumbai', 'arbitrum-sepolia', 'base-sepolia']);
    });
  });

  describe('chainNameToNetwork', () => {
    it('should convert chain names to network keys', () => {
      expect(chainNameToNetwork(ChainName.ethereum)).toBe('ethereum');
      expect(chainNameToNetwork(ChainName.polygon)).toBe('polygon');
      expect(chainNameToNetwork(ChainName.arbitrum)).toBe('arbitrum');
      expect(chainNameToNetwork(ChainName.base)).toBe('base');
      expect(chainNameToNetwork(ChainName.xrpl)).toBe('xrpl');
      expect(chainNameToNetwork(ChainName.solana)).toBe('solana');
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('should return block explorer URL for valid network', () => {
      const url = getBlockExplorerUrl('sepolia');
      expect(url).toBe('https://sepolia.etherscan.io');
    });

    it('should return undefined for invalid network', () => {
      const url = getBlockExplorerUrl('invalid-network');
      expect(url).toBeUndefined();
    });
  });

  describe('getTransactionUrl', () => {
    it('should return transaction URL for valid network', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = getTransactionUrl('sepolia', txHash);
      
      expect(url).toBe(`https://sepolia.etherscan.io/tx/${txHash}`);
    });

    it('should return undefined for invalid network', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = getTransactionUrl('invalid-network', txHash);
      
      expect(url).toBeUndefined();
    });
  });

  describe('getContractUrl', () => {
    it('should return contract URL for valid network', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const url = getContractUrl('sepolia', address);
      
      expect(url).toBe(`https://sepolia.etherscan.io/address/${address}`);
    });

    it('should return undefined for invalid network', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const url = getContractUrl('invalid-network', address);
      
      expect(url).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle networks with no contracts deployed', () => {
      const addresses = getAllContractAddresses('ethereum');
      expect(addresses).toEqual({});
      
      const isDeployed = isContractDeployed('ethereum', 'yieldEscrow');
      expect(isDeployed).toBe(false);
    });

    it('should handle networks with partial contract deployments', () => {
      // Mumbai has some contracts but not all
      const mumbaiAddresses = getAllContractAddresses('mumbai');
      expect(Object.keys(mumbaiAddresses).length).toBeGreaterThan(0);
      
      // Should not include contracts that don't exist
      expect(mumbaiAddresses.mockUSDC).toBeUndefined();
    });

    it('should handle case-insensitive network names consistently', () => {
      const config1 = getDeploymentConfig('SEPOLIA');
      const config2 = getDeploymentConfig('Sepolia');
      const config3 = getDeploymentConfig('sepolia');
      
      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
    });
  });
});