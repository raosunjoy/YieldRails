import { ethers } from 'ethers';
import Config from 'react-native-config';
import { WalletService } from './WalletService';

export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    yieldEscrow: ContractConfig;
    yieldVault: ContractConfig;
    crossChainBridge: ContractConfig;
  };
}

export class Web3Service {
  private static instance: Web3Service;
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<string, ethers.Contract> = new Map();
  private walletService: WalletService;

  private constructor() {
    this.walletService = WalletService.getInstance();
  }

  public static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  async initialize(): Promise<void> {
    // Initialize providers for all supported chains
    const chainConfigs = this.getChainConfigs();
    
    for (const config of chainConfigs) {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.providers.set(config.chainId, provider);
      
      // Initialize contracts for this chain
      await this.initializeContractsForChain(config);
    }
  }

  private getChainConfigs(): ChainConfig[] {
    return [
      {
        chainId: 1,
        name: 'Ethereum',
        rpcUrl: Config.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo',
        explorerUrl: 'https://etherscan.io',
        contracts: {
          yieldEscrow: {
            address: Config.YIELD_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [], // Would include actual ABI
          },
          yieldVault: {
            address: Config.YIELD_VAULT_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [], // Would include actual ABI
          },
          crossChainBridge: {
            address: Config.CROSS_CHAIN_BRIDGE_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [], // Would include actual ABI
          },
        },
      },
      {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: Config.POLYGON_RPC_URL || 'https://polygon-mainnet.alchemyapi.io/v2/demo',
        explorerUrl: 'https://polygonscan.com',
        contracts: {
          yieldEscrow: {
            address: Config.YIELD_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
          yieldVault: {
            address: Config.YIELD_VAULT_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
          crossChainBridge: {
            address: Config.CROSS_CHAIN_BRIDGE_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
        },
      },
      {
        chainId: 42161,
        name: 'Arbitrum',
        rpcUrl: Config.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://arbiscan.io',
        contracts: {
          yieldEscrow: {
            address: Config.YIELD_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
          yieldVault: {
            address: Config.YIELD_VAULT_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
          crossChainBridge: {
            address: Config.CROSS_CHAIN_BRIDGE_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
        },
      },
      {
        chainId: 8453,
        name: 'Base',
        rpcUrl: Config.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://basescan.org',
        contracts: {
          yieldEscrow: {
            address: Config.YIELD_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
          yieldVault: {
            address: Config.YIELD_VAULT_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
          crossChainBridge: {
            address: Config.CROSS_CHAIN_BRIDGE_CONTRACT || '0x0000000000000000000000000000000000000000',
            abi: [],
          },
        },
      },
    ];
  }

  private async initializeContractsForChain(config: ChainConfig): Promise<void> {
    const provider = this.providers.get(config.chainId);
    if (!provider) return;

    // Initialize YieldEscrow contract
    const yieldEscrowKey = `${config.chainId}-yieldEscrow`;
    const yieldEscrowContract = new ethers.Contract(
      config.contracts.yieldEscrow.address,
      config.contracts.yieldEscrow.abi,
      provider
    );
    this.contracts.set(yieldEscrowKey, yieldEscrowContract);

    // Initialize YieldVault contract
    const yieldVaultKey = `${config.chainId}-yieldVault`;
    const yieldVaultContract = new ethers.Contract(
      config.contracts.yieldVault.address,
      config.contracts.yieldVault.abi,
      provider
    );
    this.contracts.set(yieldVaultKey, yieldVaultContract);

    // Initialize CrossChainBridge contract
    const bridgeKey = `${config.chainId}-crossChainBridge`;
    const bridgeContract = new ethers.Contract(
      config.contracts.crossChainBridge.address,
      config.contracts.crossChainBridge.abi,
      provider
    );
    this.contracts.set(bridgeKey, bridgeContract);
  }

  getProvider(chainId: number): ethers.JsonRpcProvider | undefined {
    return this.providers.get(chainId);
  }

  getContract(chainId: number, contractType: 'yieldEscrow' | 'yieldVault' | 'crossChainBridge'): ethers.Contract | undefined {
    const key = `${chainId}-${contractType}`;
    return this.contracts.get(key);
  }

  async createPaymentOnChain(
    chainId: number,
    recipient: string,
    amount: string,
    currency: string
  ): Promise<string> {
    try {
      const contract = this.getContract(chainId, 'yieldEscrow');
      if (!contract) {
        throw new Error('Contract not found for chain');
      }

      const connectedWallet = this.walletService.getConnectedWallet();
      if (!connectedWallet) {
        throw new Error('Wallet not connected');
      }

      // Connect contract to signer
      const provider = this.getProvider(chainId);
      if (!provider) {
        throw new Error('Provider not found for chain');
      }

      // For demo purposes, we'll simulate the transaction
      // In real implementation, this would call the actual contract method
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      return mockTxHash;
    } catch (error) {
      console.error('Failed to create payment on chain:', error);
      throw new Error('Failed to create payment on chain');
    }
  }

  async depositToYieldVault(
    chainId: number,
    strategyId: string,
    amount: string,
    currency: string
  ): Promise<string> {
    try {
      const contract = this.getContract(chainId, 'yieldVault');
      if (!contract) {
        throw new Error('YieldVault contract not found for chain');
      }

      const connectedWallet = this.walletService.getConnectedWallet();
      if (!connectedWallet) {
        throw new Error('Wallet not connected');
      }

      // Simulate yield vault deposit
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      return mockTxHash;
    } catch (error) {
      console.error('Failed to deposit to yield vault:', error);
      throw new Error('Failed to deposit to yield vault');
    }
  }

  async initiateCrossChainTransfer(
    sourceChainId: number,
    targetChainId: number,
    recipient: string,
    amount: string,
    currency: string
  ): Promise<string> {
    try {
      const contract = this.getContract(sourceChainId, 'crossChainBridge');
      if (!contract) {
        throw new Error('CrossChainBridge contract not found for source chain');
      }

      const connectedWallet = this.walletService.getConnectedWallet();
      if (!connectedWallet) {
        throw new Error('Wallet not connected');
      }

      // Simulate cross-chain transfer initiation
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      return mockTxHash;
    } catch (error) {
      console.error('Failed to initiate cross-chain transfer:', error);
      throw new Error('Failed to initiate cross-chain transfer');
    }
  }

  async estimateGas(
    chainId: number,
    contractType: 'yieldEscrow' | 'yieldVault' | 'crossChainBridge',
    method: string,
    params: any[]
  ): Promise<string> {
    try {
      const contract = this.getContract(chainId, contractType);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Simulate gas estimation
      const baseGas = 21000;
      const methodGas = {
        createPayment: 150000,
        deposit: 120000,
        withdraw: 100000,
        initiateBridge: 200000,
      };

      const estimatedGas = baseGas + (methodGas[method as keyof typeof methodGas] || 100000);
      
      return estimatedGas.toString();
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw new Error('Failed to estimate gas');
    }
  }

  async getTransactionReceipt(chainId: number, txHash: string): Promise<any> {
    try {
      const provider = this.getProvider(chainId);
      if (!provider) {
        throw new Error('Provider not found for chain');
      }

      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      return null;
    }
  }

  async getBlockNumber(chainId: number): Promise<number> {
    try {
      const provider = this.getProvider(chainId);
      if (!provider) {
        throw new Error('Provider not found for chain');
      }

      const blockNumber = await provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.error('Failed to get block number:', error);
      return 0;
    }
  }

  async subscribeToEvents(
    chainId: number,
    contractType: 'yieldEscrow' | 'yieldVault' | 'crossChainBridge',
    eventName: string,
    callback: (event: any) => void
  ): Promise<void> {
    try {
      const contract = this.getContract(chainId, contractType);
      if (!contract) {
        throw new Error('Contract not found');
      }

      contract.on(eventName, callback);
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
      throw new Error('Failed to subscribe to events');
    }
  }

  async unsubscribeFromEvents(
    chainId: number,
    contractType: 'yieldEscrow' | 'yieldVault' | 'crossChainBridge',
    eventName?: string
  ): Promise<void> {
    try {
      const contract = this.getContract(chainId, contractType);
      if (!contract) {
        return;
      }

      if (eventName) {
        contract.removeAllListeners(eventName);
      } else {
        contract.removeAllListeners();
      }
    } catch (error) {
      console.error('Failed to unsubscribe from events:', error);
    }
  }

  getExplorerUrl(chainId: number, txHash: string): string {
    const config = this.getChainConfigs().find(c => c.chainId === chainId);
    if (!config) {
      return '';
    }
    
    return `${config.explorerUrl}/tx/${txHash}`;
  }

  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  formatUnits(value: string, decimals: number = 18): string {
    try {
      return ethers.formatUnits(value, decimals);
    } catch {
      return '0';
    }
  }

  parseUnits(value: string, decimals: number = 18): string {
    try {
      return ethers.parseUnits(value, decimals).toString();
    } catch {
      return '0';
    }
  }
}