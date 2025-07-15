import { jest } from '@jest/globals';
import { ContractService } from '../../src/services/ContractService';
import { ethers } from 'ethers';
import { BlockchainTestUtils, ErrorTestUtils } from '../helpers/testUtils';

// Mock ethers
jest.mock('ethers');

describe('ContractService', () => {
    let contractService: ContractService;
    let mockProvider: any;
    let mockWallet: any;
    let mockContract: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        mockProvider = BlockchainTestUtils.createMockProvider();
        mockWallet = BlockchainTestUtils.createMockWallet();
        mockContract = BlockchainTestUtils.createMockContract();

        // Mock ethers constructors
        (ethers.JsonRpcProvider as jest.MockedClass<typeof ethers.JsonRpcProvider>)
            .mockImplementation(() => mockProvider);
        (ethers.Wallet as jest.MockedClass<typeof ethers.Wallet>)
            .mockImplementation(() => mockWallet);
        (ethers.Contract as jest.MockedClass<typeof ethers.Contract>)
            .mockImplementation(() => mockContract);

        // Mock environment
        process.env.OPERATOR_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';

        contractService = new ContractService();
    });

    afterEach(() => {
        delete process.env.OPERATOR_PRIVATE_KEY;
    });

    describe('Initialization', () => {
        it('should initialize providers for all chains', () => {
            expect(ethers.JsonRpcProvider).toHaveBeenCalled();
        });

        it('should initialize wallets when private key is provided', () => {
            expect(ethers.Wallet).toHaveBeenCalled();
        });

        it('should handle missing private key gracefully', () => {
            delete process.env.OPERATOR_PRIVATE_KEY;
            
            // Should not throw error
            expect(() => new ContractService()).not.toThrow();
        });
    });

    describe('getProvider', () => {
        it('should return provider for valid chain', () => {
            const provider = contractService.getProvider('ethereum' as any);
            expect(provider).toBe(mockProvider);
        });

        it('should throw error for invalid chain', () => {
            expect(() => contractService.getProvider('invalid-chain' as any))
                .toThrow('Provider not found for chain: invalid-chain');
        });
    });

    describe('getWallet', () => {
        it('should return wallet for valid chain', () => {
            const wallet = contractService.getWallet('ethereum' as any);
            expect(wallet).toBe(mockWallet);
        });

        it('should throw error for invalid chain', () => {
            expect(() => contractService.getWallet('invalid-chain' as any))
                .toThrow('Wallet not found for chain: invalid-chain');
        });
    });

    describe('createEscrow', () => {
        const escrowParams = {
            contractAddress: '0x1234567890123456789012345678901234567890',
            chain: 'ethereum' as any,
            amount: '100.0',
            token: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
            merchant: '0x9876543210987654321098765432109876543210',
            yieldStrategy: '0x5555555555555555555555555555555555555555',
            paymentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            metadata: 'test payment'
        };

        beforeEach(() => {
            // Mock ethers.parseUnits
            (ethers.parseUnits as jest.MockedFunction<typeof ethers.parseUnits>)
                .mockReturnValue(BigInt('100000000')); // 100 USDC with 6 decimals

            // Mock contract transaction
            const mockTx = {
                hash: '0xtxhash123',
                wait: jest.fn().mockResolvedValue({
                    logs: [{
                        topics: ['0xevent'],
                        data: '0xdata'
                    }],
                    gasUsed: BigInt('50000')
                })
            };

            mockContract.createDeposit.mockResolvedValue(mockTx);
            mockContract.interface = {
                parseLog: jest.fn().mockReturnValue({
                    name: 'DepositCreated',
                    args: { depositIndex: BigInt('0') }
                })
            };
        });

        it('should create escrow successfully', async () => {
            const result = await contractService.createEscrow(
                escrowParams.contractAddress,
                escrowParams.chain,
                escrowParams.amount,
                escrowParams.token,
                escrowParams.merchant,
                escrowParams.yieldStrategy,
                escrowParams.paymentHash,
                escrowParams.metadata
            );

            expect(result).toEqual({
                transactionHash: '0xtxhash123',
                depositIndex: 0
            });

            expect(mockContract.createDeposit).toHaveBeenCalledWith(
                BigInt('100000000'),
                escrowParams.token,
                escrowParams.merchant,
                escrowParams.yieldStrategy,
                escrowParams.paymentHash,
                escrowParams.metadata
            );
        });

        it('should handle contract call failure', async () => {
            mockContract.createDeposit.mockRejectedValue(new Error('Contract call failed'));

            await ErrorTestUtils.expectToThrow(
                () => contractService.createEscrow(
                    escrowParams.contractAddress,
                    escrowParams.chain,
                    escrowParams.amount,
                    escrowParams.token,
                    escrowParams.merchant,
                    escrowParams.yieldStrategy,
                    escrowParams.paymentHash,
                    escrowParams.metadata
                ),
                'Contract call failed'
            );
        });

        it('should parse deposit index from event logs', async () => {
            const mockTx = {
                hash: '0xtxhash123',
                wait: jest.fn().mockResolvedValue({
                    logs: [{
                        topics: ['0xevent'],
                        data: '0xdata'
                    }],
                    gasUsed: BigInt('50000')
                })
            };

            mockContract.createDeposit.mockResolvedValue(mockTx);
            mockContract.interface.parseLog.mockReturnValue({
                name: 'DepositCreated',
                args: { depositIndex: BigInt('5') }
            });

            const result = await contractService.createEscrow(
                escrowParams.contractAddress,
                escrowParams.chain,
                escrowParams.amount,
                escrowParams.token,
                escrowParams.merchant,
                escrowParams.yieldStrategy,
                escrowParams.paymentHash,
                escrowParams.metadata
            );

            expect(result.depositIndex).toBe(5);
        });
    });

    describe('releasePayment', () => {
        beforeEach(() => {
            const mockTx = {
                hash: '0xreleasehash123',
                wait: jest.fn().mockResolvedValue({
                    gasUsed: BigInt('75000')
                })
            };

            mockContract.releasePayment.mockResolvedValue(mockTx);
        });

        it('should release payment successfully', async () => {
            const result = await contractService.releasePayment(
                '0x1234567890123456789012345678901234567890',
                '0xuser123',
                '0xmerchant456',
                '100.0',
                '5.0'
            );

            expect(result).toEqual({
                transactionHash: '0xreleasehash123',
                gasUsed: '75000'
            });

            expect(mockContract.releasePayment).toHaveBeenCalledWith('0xuser123', 0);
        });

        it('should handle release failure', async () => {
            mockContract.releasePayment.mockRejectedValue(new Error('Release failed'));

            await ErrorTestUtils.expectToThrow(
                () => contractService.releasePayment(
                    '0x1234567890123456789012345678901234567890',
                    '0xuser123',
                    '0xmerchant456',
                    '100.0',
                    '5.0'
                ),
                'Release failed'
            );
        });
    });

    describe('cancelPayment', () => {
        beforeEach(() => {
            const mockTx = {
                hash: '0xcancelhash123',
                wait: jest.fn().mockResolvedValue({})
            };

            mockContract.emergencyWithdraw.mockResolvedValue(mockTx);
        });

        it('should cancel payment successfully', async () => {
            const result = await contractService.cancelPayment(
                '0x1234567890123456789012345678901234567890',
                'User requested cancellation'
            );

            expect(result).toEqual({
                transactionHash: '0xcancelhash123'
            });

            expect(mockContract.emergencyWithdraw).toHaveBeenCalledWith(
                0,
                'User requested cancellation'
            );
        });

        it('should use default reason if none provided', async () => {
            await contractService.cancelPayment('0x1234567890123456789012345678901234567890');

            expect(mockContract.emergencyWithdraw).toHaveBeenCalledWith(
                0,
                'Payment cancelled'
            );
        });
    });

    describe('getDeposit', () => {
        beforeEach(() => {
            mockContract.getUserDeposit.mockResolvedValue({
                amount: BigInt('100000000'),
                timestamp: BigInt('1640995200'),
                token: '0xtoken123',
                merchant: '0xmerchant456',
                yieldStrategy: '0xstrategy789',
                yieldAccrued: BigInt('5000000'),
                released: false,
                paymentHash: '0xhash123',
                metadata: 'test deposit'
            });

            // Mock ethers.formatUnits
            (ethers.formatUnits as jest.MockedFunction<typeof ethers.formatUnits>)
                .mockImplementation((value: any, decimals: number) => {
                    if (value === BigInt('100000000')) return '100.0';
                    if (value === BigInt('5000000')) return '5.0';
                    return '0.0';
                });
        });

        it('should get deposit information successfully', async () => {
            const result = await contractService.getDeposit(
                '0x1234567890123456789012345678901234567890',
                'ethereum' as any,
                '0xuser123',
                0
            );

            expect(result).toEqual({
                amount: '100.0',
                timestamp: 1640995200,
                token: '0xtoken123',
                merchant: '0xmerchant456',
                yieldStrategy: '0xstrategy789',
                yieldAccrued: '5.0',
                released: false,
                paymentHash: '0xhash123',
                metadata: 'test deposit'
            });
        });

        it('should handle get deposit failure', async () => {
            mockContract.getUserDeposit.mockRejectedValue(new Error('Deposit not found'));

            await ErrorTestUtils.expectToThrow(
                () => contractService.getDeposit(
                    '0x1234567890123456789012345678901234567890',
                    'ethereum' as any,
                    '0xuser123',
                    0
                ),
                'Deposit not found'
            );
        });
    });

    describe('calculateYield', () => {
        beforeEach(() => {
            mockContract.calculateYield.mockResolvedValue(BigInt('3000000'));
            (ethers.formatUnits as jest.MockedFunction<typeof ethers.formatUnits>)
                .mockReturnValue('3.0');
        });

        it('should calculate yield successfully', async () => {
            const result = await contractService.calculateYield(
                '0x1234567890123456789012345678901234567890',
                'ethereum' as any,
                '0xuser123',
                0
            );

            expect(result).toBe('3.0');
            expect(mockContract.calculateYield).toHaveBeenCalledWith('0xuser123', 0);
        });

        it('should handle yield calculation failure', async () => {
            mockContract.calculateYield.mockRejectedValue(new Error('Yield calculation failed'));

            await ErrorTestUtils.expectToThrow(
                () => contractService.calculateYield(
                    '0x1234567890123456789012345678901234567890',
                    'ethereum' as any,
                    '0xuser123',
                    0
                ),
                'Yield calculation failed'
            );
        });
    });

    describe('getStrategyMetrics', () => {
        beforeEach(() => {
            mockContract.getStrategyMetrics.mockResolvedValue({
                totalDeposited: BigInt('1000000000'),
                totalYieldGenerated: BigInt('50000000'),
                averageAPY: BigInt('500'), // 5% in basis points
                lastUpdateTime: BigInt('1640995200')
            });

            (ethers.formatUnits as jest.MockedFunction<typeof ethers.formatUnits>)
                .mockImplementation((value: any) => {
                    if (value === BigInt('1000000000')) return '1000.0';
                    if (value === BigInt('50000000')) return '50.0';
                    return '0.0';
                });
        });

        it('should get strategy metrics successfully', async () => {
            const result = await contractService.getStrategyMetrics(
                '0x1234567890123456789012345678901234567890',
                'ethereum' as any,
                '0xstrategy123'
            );

            expect(result).toEqual({
                totalDeposited: '1000.0',
                totalYieldGenerated: '50.0',
                averageAPY: 5, // Converted from basis points
                lastUpdateTime: 1640995200
            });
        });
    });

    describe('Event Monitoring', () => {
        it('should start event monitoring successfully', async () => {
            const eventHandlers = {
                DepositCreated: jest.fn(),
                PaymentReleased: jest.fn(),
                YieldCalculated: jest.fn()
            };

            await contractService.startEventMonitoring(
                '0x1234567890123456789012345678901234567890',
                'ethereum' as any,
                eventHandlers
            );

            expect(mockContract.on).toHaveBeenCalledWith('DepositCreated', eventHandlers.DepositCreated);
            expect(mockContract.on).toHaveBeenCalledWith('PaymentReleased', eventHandlers.PaymentReleased);
            expect(mockContract.on).toHaveBeenCalledWith('YieldCalculated', eventHandlers.YieldCalculated);
        });

        it('should stop event monitoring successfully', async () => {
            await contractService.stopEventMonitoring(
                '0x1234567890123456789012345678901234567890',
                'ethereum' as any
            );

            expect(mockContract.removeAllListeners).toHaveBeenCalled();
        });
    });

    describe('getTransactionReceipt', () => {
        beforeEach(() => {
            mockProvider.getTransactionReceipt.mockResolvedValue({
                transactionHash: '0xtxhash123',
                blockNumber: 12345,
                gasUsed: BigInt('50000'),
                status: 1
            });
        });

        it('should get transaction receipt successfully', async () => {
            const result = await contractService.getTransactionReceipt(
                'ethereum' as any,
                '0xtxhash123'
            );

            expect(result).toEqual({
                transactionHash: '0xtxhash123',
                blockNumber: 12345,
                gasUsed: BigInt('50000'),
                status: 1
            });

            expect(mockProvider.getTransactionReceipt).toHaveBeenCalledWith('0xtxhash123');
        });
    });

    describe('estimateGas', () => {
        beforeEach(() => {
            mockContract.createDeposit = {
                estimateGas: jest.fn().mockResolvedValue(BigInt('100000'))
            };
        });

        it('should estimate gas successfully', async () => {
            const result = await contractService.estimateGas(
                '0x1234567890123456789012345678901234567890',
                'ethereum' as any,
                'createDeposit',
                ['100', '0xtoken', '0xmerchant']
            );

            expect(result).toBe('100000');
            expect(mockContract.createDeposit.estimateGas).toHaveBeenCalledWith(
                '100',
                '0xtoken',
                '0xmerchant'
            );
        });

        it('should handle gas estimation failure', async () => {
            mockContract.createDeposit = {
                estimateGas: jest.fn().mockRejectedValue(new Error('Gas estimation failed'))
            };

            await ErrorTestUtils.expectToThrow(
                () => contractService.estimateGas(
                    '0x1234567890123456789012345678901234567890',
                    'ethereum' as any,
                    'createDeposit',
                    ['100', '0xtoken', '0xmerchant']
                ),
                'Gas estimation failed'
            );
        });
    });

    describe('Contract Caching', () => {
        it('should cache contract instances', () => {
            const contractAddress = '0x1234567890123456789012345678901234567890';
            const chain = 'ethereum' as any;

            // First call should create contract
            contractService['getContract'](contractAddress, chain);
            expect(ethers.Contract).toHaveBeenCalledTimes(1);

            // Second call should use cached contract
            contractService['getContract'](contractAddress, chain);
            expect(ethers.Contract).toHaveBeenCalledTimes(1);
        });

        it('should create separate contracts for different addresses', () => {
            const address1 = '0x1234567890123456789012345678901234567890';
            const address2 = '0x9876543210987654321098765432109876543210';
            const chain = 'ethereum' as any;

            contractService['getContract'](address1, chain);
            contractService['getContract'](address2, chain);

            expect(ethers.Contract).toHaveBeenCalledTimes(2);
        });
    });
});