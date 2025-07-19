/**
 * YieldRails-specific contract helpers
 */

import { ethers } from 'ethers';
import { ContractHelper } from './contract-helper';
import { ChainName } from '../types/common';

export interface YieldEscrowDeposit {
  depositId: string;
  user: string;
  merchant: string;
  amount: string;
  token: string;
  strategy: string;
  yieldGenerated: string;
  depositTime: number;
  isReleased: boolean;
}

export interface YieldStrategy {
  id: string;
  name: string;
  contractAddress: string;
  isActive: boolean;
  expectedAPY: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BridgeTransaction {
  transactionId: string;
  sourceChain: string;
  destinationChain: string;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  token: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  bridgeFee: string;
  yieldDuringTransit: string;
}

export class YieldRailsContracts {
  private contractHelper: ContractHelper;

  // Contract addresses by chain (will be populated from deployment artifacts)
  private contractAddresses: Record<ChainName, {
    yieldEscrow?: string;
    yieldVault?: string;
    crossChainBridge?: string;
  }> = {
    [ChainName.ethereum]: {},
    [ChainName.polygon]: {},
    [ChainName.arbitrum]: {},
    [ChainName.base]: {},
    [ChainName.xrpl]: {},
    [ChainName.solana]: {},
  };

  constructor(contractHelper?: ContractHelper) {
    this.contractHelper = contractHelper || new ContractHelper();
  }

  /**
   * Set contract addresses for a specific chain
   */
  public setContractAddresses(
    chain: ChainName,
    addresses: {
      yieldEscrow?: string;
      yieldVault?: string;
      crossChainBridge?: string;
    }
  ): void {
    this.contractAddresses[chain] = {
      ...this.contractAddresses[chain],
      ...addresses,
    };
  }

  /**
   * Initialize YieldEscrow contract
   */
  public async initYieldEscrow(
    chain: ChainName,
    abi: any[],
    signer?: ethers.Signer
  ): Promise<ethers.Contract> {
    const address = this.contractAddresses[chain]?.yieldEscrow;
    if (!address) {
      throw new Error(`YieldEscrow contract address not set for chain ${chain}`);
    }

    return this.contractHelper.initContractOnChain(
      `yieldEscrow_${chain}`,
      chain,
      address,
      abi,
      signer
    );
  }

  /**
   * Initialize YieldVault contract
   */
  public async initYieldVault(
    chain: ChainName,
    abi: any[],
    signer?: ethers.Signer
  ): Promise<ethers.Contract> {
    const address = this.contractAddresses[chain]?.yieldVault;
    if (!address) {
      throw new Error(`YieldVault contract address not set for chain ${chain}`);
    }

    return this.contractHelper.initContractOnChain(
      `yieldVault_${chain}`,
      chain,
      address,
      abi,
      signer
    );
  }

  /**
   * Initialize CrossChainBridge contract
   */
  public async initCrossChainBridge(
    chain: ChainName,
    abi: any[],
    signer?: ethers.Signer
  ): Promise<ethers.Contract> {
    const address = this.contractAddresses[chain]?.crossChainBridge;
    if (!address) {
      throw new Error(`CrossChainBridge contract address not set for chain ${chain}`);
    }

    return this.contractHelper.initContractOnChain(
      `crossChainBridge_${chain}`,
      chain,
      address,
      abi,
      signer
    );
  }

  /**
   * Create a deposit in YieldEscrow
   */
  public async createDeposit(
    chain: ChainName,
    merchant: string,
    amount: string,
    token: string,
    strategy: string,
    overrides: ethers.Overrides = {}
  ): Promise<ethers.TransactionResponse> {
    const contractId = `yieldEscrow_${chain}`;
    
    return this.contractHelper.writeContract(
      contractId,
      'createDeposit',
      [merchant, amount, token, strategy],
      overrides
    );
  }

  /**
   * Release a deposit from YieldEscrow
   */
  public async releaseDeposit(
    chain: ChainName,
    depositId: string,
    overrides: ethers.Overrides = {}
  ): Promise<ethers.TransactionResponse> {
    const contractId = `yieldEscrow_${chain}`;
    
    return this.contractHelper.writeContract(
      contractId,
      'releaseDeposit',
      [depositId],
      overrides
    );
  }

  /**
   * Get deposit details
   */
  public async getDeposit(
    chain: ChainName,
    depositId: string
  ): Promise<YieldEscrowDeposit> {
    const contractId = `yieldEscrow_${chain}`;
    
    const result = await this.contractHelper.readContract<any>(
      contractId,
      'getDeposit',
      [depositId]
    );

    return {
      depositId: result.id,
      user: result.user,
      merchant: result.merchant,
      amount: result.amount.toString(),
      token: result.token,
      strategy: result.strategy,
      yieldGenerated: result.yieldGenerated.toString(),
      depositTime: result.depositTime.toNumber(),
      isReleased: result.isReleased,
    };
  }

  /**
   * Calculate current yield for a deposit
   */
  public async calculateYield(
    chain: ChainName,
    depositId: string
  ): Promise<string> {
    const contractId = `yieldEscrow_${chain}`;
    
    const result = await this.contractHelper.readContract<bigint>(
      contractId,
      'calculateCurrentYield',
      [depositId]
    );

    return result.toString();
  }

  /**
   * Get user deposits
   */
  public async getUserDeposits(
    chain: ChainName,
    userAddress: string
  ): Promise<string[]> {
    const contractId = `yieldEscrow_${chain}`;
    
    return this.contractHelper.readContract<string[]>(
      contractId,
      'getUserDeposits',
      [userAddress]
    );
  }

  /**
   * Get available yield strategies
   */
  public async getYieldStrategies(chain: ChainName): Promise<YieldStrategy[]> {
    const contractId = `yieldVault_${chain}`;
    
    const result = await this.contractHelper.readContract<any[]>(
      contractId,
      'getActiveStrategies',
      []
    );

    return result.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      contractAddress: strategy.contractAddress,
      isActive: strategy.isActive,
      expectedAPY: strategy.expectedAPY.toString(),
      riskLevel: strategy.riskLevel,
    }));
  }

  /**
   * Initiate cross-chain bridge transaction
   */
  public async initiateBridge(
    sourceChain: ChainName,
    destinationChain: string,
    destinationAddress: string,
    amount: string,
    token: string,
    overrides: ethers.Overrides = {}
  ): Promise<ethers.TransactionResponse> {
    const contractId = `crossChainBridge_${sourceChain}`;
    
    return this.contractHelper.writeContract(
      contractId,
      'initiateBridge',
      [destinationChain, destinationAddress, amount, token],
      overrides
    );
  }

  /**
   * Get bridge transaction details
   */
  public async getBridgeTransaction(
    chain: ChainName,
    transactionId: string
  ): Promise<BridgeTransaction> {
    const contractId = `crossChainBridge_${chain}`;
    
    const result = await this.contractHelper.readContract<any>(
      contractId,
      'getBridgeTransaction',
      [transactionId]
    );

    return {
      transactionId: result.transactionId,
      sourceChain: result.sourceChain,
      destinationChain: result.destinationChain,
      sourceAddress: result.sourceAddress,
      destinationAddress: result.destinationAddress,
      amount: result.amount.toString(),
      token: result.token,
      status: result.status,
      bridgeFee: result.bridgeFee.toString(),
      yieldDuringTransit: result.yieldDuringTransit.toString(),
    };
  }

  /**
   * Estimate gas for deposit creation
   */
  public async estimateDepositGas(
    chain: ChainName,
    merchant: string,
    amount: string,
    token: string,
    strategy: string,
    overrides: ethers.Overrides = {}
  ): Promise<bigint> {
    const contractId = `yieldEscrow_${chain}`;
    
    return this.contractHelper.estimateGas(
      contractId,
      'createDeposit',
      [merchant, amount, token, strategy],
      overrides
    );
  }

  /**
   * Estimate gas for bridge transaction
   */
  public async estimateBridgeGas(
    sourceChain: ChainName,
    destinationChain: string,
    destinationAddress: string,
    amount: string,
    token: string,
    overrides: ethers.Overrides = {}
  ): Promise<bigint> {
    const contractId = `crossChainBridge_${sourceChain}`;
    
    return this.contractHelper.estimateGas(
      contractId,
      'initiateBridge',
      [destinationChain, destinationAddress, amount, token],
      overrides
    );
  }

  /**
   * Get contract events
   */
  public async getDepositEvents(
    chain: ChainName,
    userAddress?: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    const contractId = `yieldEscrow_${chain}`;
    const contract = this.contractHelper.getContract(contractId);
    
    const filter = userAddress 
      ? contract.filters.DepositCreated(userAddress)
      : contract.filters.DepositCreated();
    
    return contract.queryFilter(filter, fromBlock, toBlock);
  }

  /**
   * Get yield earned events
   */
  public async getYieldEarnedEvents(
    chain: ChainName,
    userAddress?: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    const contractId = `yieldEscrow_${chain}`;
    const contract = this.contractHelper.getContract(contractId);
    
    const filter = userAddress 
      ? contract.filters.YieldEarned(userAddress)
      : contract.filters.YieldEarned();
    
    return contract.queryFilter(filter, fromBlock, toBlock);
  }

  /**
   * Get bridge events
   */
  public async getBridgeEvents(
    chain: ChainName,
    userAddress?: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    const contractId = `crossChainBridge_${chain}`;
    const contract = this.contractHelper.getContract(contractId);
    
    const filter = userAddress 
      ? contract.filters.BridgeInitiated(userAddress)
      : contract.filters.BridgeInitiated();
    
    return contract.queryFilter(filter, fromBlock, toBlock);
  }

  /**
   * Listen for real-time events
   */
  public onDepositCreated(
    chain: ChainName,
    callback: (event: any) => void,
    userAddress?: string
  ): void {
    const contractId = `yieldEscrow_${chain}`;
    const contract = this.contractHelper.getContract(contractId);
    
    const filter = userAddress 
      ? contract.filters.DepositCreated(userAddress)
      : contract.filters.DepositCreated();
    
    contract.on(filter, callback);
  }

  /**
   * Listen for yield earned events
   */
  public onYieldEarned(
    chain: ChainName,
    callback: (event: any) => void,
    userAddress?: string
  ): void {
    const contractId = `yieldEscrow_${chain}`;
    const contract = this.contractHelper.getContract(contractId);
    
    const filter = userAddress 
      ? contract.filters.YieldEarned(userAddress)
      : contract.filters.YieldEarned();
    
    contract.on(filter, callback);
  }

  /**
   * Listen for bridge events
   */
  public onBridgeInitiated(
    chain: ChainName,
    callback: (event: any) => void,
    userAddress?: string
  ): void {
    const contractId = `crossChainBridge_${chain}`;
    const contract = this.contractHelper.getContract(contractId);
    
    const filter = userAddress 
      ? contract.filters.BridgeInitiated(userAddress)
      : contract.filters.BridgeInitiated();
    
    contract.on(filter, callback);
  }

  /**
   * Remove all event listeners for a chain
   */
  public removeAllListeners(chain: ChainName): void {
    const contractIds = [
      `yieldEscrow_${chain}`,
      `yieldVault_${chain}`,
      `crossChainBridge_${chain}`,
    ];

    contractIds.forEach(contractId => {
      try {
        const contract = this.contractHelper.getContract(contractId);
        contract.removeAllListeners();
      } catch (error) {
        // Contract might not be initialized
      }
    });
  }

  /**
   * Get the ContractHelper instance for advanced usage
   */
  public getContractHelper(): ContractHelper {
    return this.contractHelper;
  }
}