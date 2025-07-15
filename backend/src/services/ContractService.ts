import { ethers } from 'ethers';
import { chainConfigs, ChainName } from '../config/environment';
import { logger, logBlockchainOperation } from '../utils/logger';
import YieldEscrowABI from '../../../contracts/artifacts/src/YieldEscrow.sol/YieldEscrow.json';

/**
 * Smart contract interaction service
 */
export class ContractService {
    private providers: Map<ChainName, ethers.JsonRpcProvider> = new Map();
    private contracts: Map<string, ethers.Contract> = new Map();
    private wallets: Map<ChainName, ethers.Wallet> = new Map();

    constructor() {
        this.initializeProviders();
        this.initializeWallets();
    }

    private initializeProviders(): void {
        for (const [chainName, config] of Object.entries(chainConfigs)) {
            const provider = new ethers.JsonRpcProvider(config.rpcUrl);
            this.providers.set(chainName as ChainName, provider);
        }
    }

    private initializeWallets(): void {
        const privateKey = process.env.OPERATOR_PRIVATE_KEY;
        if (!privateKey) {
            logger.warn('OPERATOR_PRIVATE_KEY not set, contract interactions will be limited');
            return;
        }

        for (const [chainName, provider] of this.providers.entries()) {
            const wallet = new ethers.Wallet(privateKey, provider);
            this.wallets.set(chainName, wallet);
        }
    }

    public getProvider(chain: ChainName): ethers.JsonRpcProvider {
        const provider = this.providers.get(chain);
        if (!provider) {
            throw new Error(`Provider not found for chain: ${chain}`);
        }
        return provider;
    }

    public getWallet(chain: ChainName): ethers.Wallet {
        const wallet = this.wallets.get(chain);
        if (!wallet) {
            throw new Error(`Wallet not found for chain: ${chain}`);
        }
        return wallet;
    }

    /**
     * Get or create contract instance
     */
    private getContract(contractAddress: string, chain: ChainName): ethers.Contract {
        const contractKey = `${chain}:${contractAddress}`;
        
        if (this.contracts.has(contractKey)) {
            return this.contracts.get(contractKey)!;
        }

        const wallet = this.getWallet(chain);
        const contract = new ethers.Contract(contractAddress, YieldEscrowABI.abi, wallet);
        this.contracts.set(contractKey, contract);
        
        return contract;
    }

    /**
     * Create escrow deposit on blockchain
     */
    public async createEscrow(
        contractAddress: string,
        chain: ChainName,
        amount: string,
        token: string,
        merchant: string,
        yieldStrategy: string,
        paymentHash: string,
        metadata: string
    ): Promise<{ transactionHash: string; depositIndex: number }> {
        try {
            const contract = this.getContract(contractAddress, chain);
            const amountWei = ethers.parseUnits(amount, 6); // Assuming USDC (6 decimals)

            logBlockchainOperation('create_escrow_start', chainConfigs[chain].chainId, contractAddress, undefined, {
                amount,
                token,
                merchant,
                yieldStrategy
            });

            const tx = await contract.createDeposit(
                amountWei,
                token,
                merchant,
                yieldStrategy,
                paymentHash,
                metadata
            );

            const receipt = await tx.wait();
            
            // Extract deposit index from event logs
            const depositCreatedEvent = receipt.logs.find((log: any) => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed?.name === 'DepositCreated';
                } catch {
                    return false;
                }
            });

            let depositIndex = 0;
            if (depositCreatedEvent) {
                const parsed = contract.interface.parseLog(depositCreatedEvent);
                depositIndex = Number(parsed?.args?.depositIndex || 0);
            }

            logBlockchainOperation('create_escrow_success', chainConfigs[chain].chainId, contractAddress, tx.hash, {
                depositIndex,
                gasUsed: receipt.gasUsed.toString()
            });

            return {
                transactionHash: tx.hash,
                depositIndex
            };

        } catch (error) {
            logBlockchainOperation('create_escrow_failed', chainConfigs[chain].chainId, contractAddress, undefined, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Release payment from escrow
     */
    public async releasePayment(
        contractAddress: string,
        userAddress: string,
        merchantAddress: string,
        amount: string,
        yieldAmount: string
    ): Promise<{ transactionHash: string; gasUsed: string }> {
        try {
            // For now, we'll use a mock implementation since we need the deposit index
            // In a real implementation, this would be stored and retrieved from the database
            const mockDepositIndex = 0;
            
            const contract = this.getContract(contractAddress, 'ethereum' as ChainName);

            logBlockchainOperation('release_payment_start', chainConfigs.ethereum.chainId, contractAddress, undefined, {
                userAddress,
                merchantAddress,
                amount,
                yieldAmount
            });

            const tx = await contract.releasePayment(userAddress, mockDepositIndex);
            const receipt = await tx.wait();

            logBlockchainOperation('release_payment_success', chainConfigs.ethereum.chainId, contractAddress, tx.hash, {
                gasUsed: receipt.gasUsed.toString()
            });

            return {
                transactionHash: tx.hash,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            logBlockchainOperation('release_payment_failed', chainConfigs.ethereum.chainId, contractAddress, undefined, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Cancel payment and return funds
     */
    public async cancelPayment(
        contractAddress: string,
        reason?: string
    ): Promise<{ transactionHash: string }> {
        try {
            const contract = this.getContract(contractAddress, 'ethereum' as ChainName);
            const mockDepositIndex = 0; // In real implementation, this would be retrieved

            const tx = await contract.emergencyWithdraw(mockDepositIndex, reason || 'Payment cancelled');
            await tx.wait();

            return { transactionHash: tx.hash };
        } catch (error) {
            logger.error('Failed to cancel payment:', error);
            throw error;
        }
    }

    /**
     * Get deposit information from blockchain
     */
    public async getDeposit(
        contractAddress: string,
        chain: ChainName,
        userAddress: string,
        depositIndex: number
    ): Promise<any> {
        try {
            const contract = this.getContract(contractAddress, chain);
            const deposit = await contract.getUserDeposit(userAddress, depositIndex);

            return {
                amount: ethers.formatUnits(deposit.amount, 6),
                timestamp: Number(deposit.timestamp),
                token: deposit.token,
                merchant: deposit.merchant,
                yieldStrategy: deposit.yieldStrategy,
                yieldAccrued: ethers.formatUnits(deposit.yieldAccrued, 6),
                released: deposit.released,
                paymentHash: deposit.paymentHash,
                metadata: deposit.metadata
            };
        } catch (error) {
            logger.error('Failed to get deposit:', error);
            throw error;
        }
    }

    /**
     * Calculate current yield for a deposit
     */
    public async calculateYield(
        contractAddress: string,
        chain: ChainName,
        userAddress: string,
        depositIndex: number
    ): Promise<string> {
        try {
            const contract = this.getContract(contractAddress, chain);
            const yieldAmount = await contract.calculateYield(userAddress, depositIndex);
            
            return ethers.formatUnits(yieldAmount, 6);
        } catch (error) {
            logger.error('Failed to calculate yield:', error);
            throw error;
        }
    }

    /**
     * Get strategy metrics
     */
    public async getStrategyMetrics(
        contractAddress: string,
        chain: ChainName,
        strategyAddress: string
    ): Promise<any> {
        try {
            const contract = this.getContract(contractAddress, chain);
            const metrics = await contract.getStrategyMetrics(strategyAddress);

            return {
                totalDeposited: ethers.formatUnits(metrics.totalDeposited, 6),
                totalYieldGenerated: ethers.formatUnits(metrics.totalYieldGenerated, 6),
                averageAPY: Number(metrics.averageAPY) / 100, // Convert from basis points
                lastUpdateTime: Number(metrics.lastUpdateTime)
            };
        } catch (error) {
            logger.error('Failed to get strategy metrics:', error);
            throw error;
        }
    }

    /**
     * Monitor blockchain events
     */
    public async startEventMonitoring(
        contractAddress: string,
        chain: ChainName,
        eventHandlers: Record<string, (event: any) => void>
    ): Promise<void> {
        try {
            const contract = this.getContract(contractAddress, chain);

            // Listen for DepositCreated events
            if (eventHandlers.DepositCreated) {
                contract.on('DepositCreated', eventHandlers.DepositCreated);
            }

            // Listen for PaymentReleased events
            if (eventHandlers.PaymentReleased) {
                contract.on('PaymentReleased', eventHandlers.PaymentReleased);
            }

            // Listen for YieldCalculated events
            if (eventHandlers.YieldCalculated) {
                contract.on('YieldCalculated', eventHandlers.YieldCalculated);
            }

            logger.info(`Started event monitoring for contract ${contractAddress} on ${chain}`);
        } catch (error) {
            logger.error('Failed to start event monitoring:', error);
            throw error;
        }
    }

    /**
     * Stop event monitoring
     */
    public async stopEventMonitoring(contractAddress: string, chain: ChainName): Promise<void> {
        try {
            const contract = this.getContract(contractAddress, chain);
            contract.removeAllListeners();
            
            logger.info(`Stopped event monitoring for contract ${contractAddress} on ${chain}`);
        } catch (error) {
            logger.error('Failed to stop event monitoring:', error);
        }
    }

    /**
     * Get transaction receipt
     */
    public async getTransactionReceipt(
        chain: ChainName,
        transactionHash: string
    ): Promise<any> {
        try {
            const provider = this.getProvider(chain);
            return await provider.getTransactionReceipt(transactionHash);
        } catch (error) {
            logger.error('Failed to get transaction receipt:', error);
            throw error;
        }
    }

    /**
     * Estimate gas for contract interaction
     */
    public async estimateGas(
        contractAddress: string,
        chain: ChainName,
        method: string,
        params: any[]
    ): Promise<string> {
        try {
            const contract = this.getContract(contractAddress, chain);
            const gasEstimate = await contract[method].estimateGas(...params);
            
            return gasEstimate.toString();
        } catch (error) {
            logger.error('Failed to estimate gas:', error);
            throw error;
        }
    }
}