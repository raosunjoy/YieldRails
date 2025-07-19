/**
 * Blockchain contract interaction helpers
 */

import { ethers } from 'ethers';
import { ChainConfig, ChainName } from '../types/common';

export interface ContractConfig {
  address: string;
  abi: any[];
  provider?: ethers.JsonRpcProvider;
  signer?: ethers.Signer;
}

export class ContractHelper {
  private chainConfigs: Record<ChainName, ChainConfig> = {
    [ChainName.ethereum]: {
      rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
      chainId: 1,
      name: 'Ethereum Mainnet',
      blockExplorer: 'https://etherscan.io',
    },
    [ChainName.polygon]: {
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      name: 'Polygon Mainnet',
      blockExplorer: 'https://polygonscan.com',
    },
    [ChainName.arbitrum]: {
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      name: 'Arbitrum One',
      blockExplorer: 'https://arbiscan.io',
    },
    [ChainName.base]: {
      rpcUrl: 'https://mainnet.base.org',
      chainId: 8453,
      name: 'Base',
      blockExplorer: 'https://basescan.org',
    },
    [ChainName.xrpl]: {
      rpcUrl: 'https://xrplcluster.com',
      chainId: 0, // XRPL doesn't use EVM chainId
      name: 'XRP Ledger',
      blockExplorer: 'https://xrpscan.com',
    },
    [ChainName.solana]: {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      chainId: 0, // Solana doesn't use EVM chainId
      name: 'Solana',
      blockExplorer: 'https://explorer.solana.com',
    },
  };

  private providers: Record<ChainName, ethers.JsonRpcProvider> = {} as Record<ChainName, ethers.JsonRpcProvider>;
  private contracts: Record<string, ethers.Contract> = {};

  /**
   * Get provider for specified chain
   */
  public getProvider(chain: ChainName): ethers.JsonRpcProvider {
    if (!this.providers[chain]) {
      const chainConfig = this.chainConfigs[chain];
      
      if (!chainConfig) {
        throw new Error(`Chain ${chain} not supported`);
      }
      
      // Skip non-EVM chains
      if (chain === ChainName.xrpl || chain === ChainName.solana) {
        throw new Error(`Chain ${chain} is not EVM compatible`);
      }
      
      this.providers[chain] = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    }
    
    return this.providers[chain];
  }

  /**
   * Set custom provider for a chain
   */
  public setProvider(chain: ChainName, provider: ethers.JsonRpcProvider): void {
    this.providers[chain] = provider;
  }

  /**
   * Set custom chain configuration
   */
  public setChainConfig(chain: ChainName, config: ChainConfig): void {
    this.chainConfigs[chain] = config;
    
    // Reset provider if it exists
    if (this.providers[chain]) {
      this.providers[chain] = new ethers.JsonRpcProvider(config.rpcUrl);
    }
  }

  /**
   * Get contract instance
   */
  public getContract(contractId: string): ethers.Contract {
    if (!this.contracts[contractId]) {
      throw new Error(`Contract ${contractId} not initialized`);
    }
    
    return this.contracts[contractId];
  }

  /**
   * Initialize contract
   */
  public initContract(
    contractId: string,
    config: ContractConfig
  ): ethers.Contract {
    const provider = config.provider || new ethers.JsonRpcProvider();
    const contract = new ethers.Contract(
      config.address,
      config.abi,
      config.signer || provider
    );
    
    this.contracts[contractId] = contract;
    return contract;
  }

  /**
   * Initialize contract on specific chain
   */
  public initContractOnChain(
    contractId: string,
    chain: ChainName,
    address: string,
    abi: any[],
    signer?: ethers.Signer
  ): ethers.Contract {
    const provider = this.getProvider(chain);
    
    const contract = new ethers.Contract(
      address,
      abi,
      signer || provider
    );
    
    this.contracts[contractId] = contract;
    return contract;
  }

  /**
   * Connect contract with signer
   */
  public connectContractWithSigner(
    contractId: string,
    signer: ethers.Signer
  ): ethers.Contract {
    const contract = this.getContract(contractId);
    const connectedContract = contract.connect(signer);
    
    // Update the stored contract
    this.contracts[contractId] = connectedContract as ethers.Contract;
    
    return connectedContract as ethers.Contract;
  }

  /**
   * Read contract data (view/pure functions)
   */
  public async readContract<T>(
    contractId: string,
    method: string,
    args: any[] = []
  ): Promise<T> {
    const contract = this.getContract(contractId);
    
    try {
      return await contract[method](...args) as T;
    } catch (error) {
      throw new Error(`Failed to read contract ${contractId}.${method}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write to contract (state-changing functions)
   */
  public async writeContract(
    contractId: string,
    method: string,
    args: any[] = [],
    overrides: ethers.Overrides = {}
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContract(contractId);
    
    try {
      return await contract[method](...args, overrides);
    } catch (error) {
      throw new Error(`Failed to write to contract ${contractId}.${method}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate gas for contract call
   */
  public async estimateGas(
    contractId: string,
    method: string,
    args: any[] = [],
    overrides: ethers.Overrides = {}
  ): Promise<bigint> {
    const contract = this.getContract(contractId);
    
    try {
      return await contract[method].estimateGas(...args, overrides);
    } catch (error) {
      throw new Error(`Failed to estimate gas for ${contractId}.${method}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction receipt and wait for confirmation
   */
  public async waitForTransaction(
    chain: ChainName,
    txHash: string,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt> {
    const provider = this.getProvider(chain);
    
    try {
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      if (!receipt) {
        throw new Error('Transaction not found or failed');
      }
      return receipt;
    } catch (error) {
      throw new Error(`Failed to wait for transaction ${txHash}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get block explorer URL for transaction
   */
  public getExplorerUrl(chain: ChainName, txHash: string): string {
    const chainConfig = this.chainConfigs[chain];
    
    if (!chainConfig || !chainConfig.blockExplorer) {
      throw new Error(`Block explorer not available for chain ${chain}`);
    }
    
    return `${chainConfig.blockExplorer}/tx/${txHash}`;
  }

  /**
   * Get block explorer URL for address
   */
  public getAddressExplorerUrl(chain: ChainName, address: string): string {
    const chainConfig = this.chainConfigs[chain];
    
    if (!chainConfig || !chainConfig.blockExplorer) {
      throw new Error(`Block explorer not available for chain ${chain}`);
    }
    
    return `${chainConfig.blockExplorer}/address/${address}`;
  }

  /**
   * Get chain configuration
   */
  public getChainConfig(chain: ChainName): ChainConfig {
    const chainConfig = this.chainConfigs[chain];
    
    if (!chainConfig) {
      throw new Error(`Chain ${chain} not supported`);
    }
    
    return { ...chainConfig };
  }

  /**
   * Get all supported chains
   */
  public getSupportedChains(): ChainName[] {
    return Object.keys(this.chainConfigs) as ChainName[];
  }
}