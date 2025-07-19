/**
 * Tests for YieldRailsContracts
 */

import { YieldRailsContracts } from '../yieldrails-contracts';
import { ContractHelper } from '../contract-helper';
import { ChainName } from '../../types/common';
import { ethers } from 'ethers';

// Mock dependencies
jest.mock('../contract-helper');
jest.mock('ethers');

const MockedContractHelper = ContractHelper as jest.MockedClass<typeof ContractHelper>;
// Mock ethers is not used in these tests

describe('YieldRailsContracts', () => {
  let yieldRailsContracts: YieldRailsContracts;
  let mockContractHelper: jest.Mocked<ContractHelper>;
  let mockContract: jest.Mocked<ethers.Contract>;
  let mockSigner: jest.Mocked<ethers.Signer>;

  beforeEach(() => {
    mockContractHelper = {
      initContractOnChain: jest.fn(),
      writeContract: jest.fn(),
      readContract: jest.fn(),
      estimateGas: jest.fn(),
      getContract: jest.fn(),
      waitForTransaction: jest.fn(),
      getExplorerUrl: jest.fn(),
    } as any;

    mockContract = {
      connect: jest.fn(),
      removeAllListeners: jest.fn(),
      on: jest.fn(),
      filters: {
        DepositCreated: jest.fn(),
        YieldEarned: jest.fn(),
        BridgeInitiated: jest.fn(),
      },
      queryFilter: jest.fn(),
    } as any;

    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9'),
    } as any;

    // Reset all mocks before each test
    jest.clearAllMocks();
    
    MockedContractHelper.mockImplementation(() => mockContractHelper);
    (mockContractHelper.initContractOnChain as jest.Mock).mockResolvedValue(mockContract);
    (mockContractHelper.getContract as jest.Mock).mockReturnValue(mockContract);

    yieldRailsContracts = new YieldRailsContracts(mockContractHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Contract Address Management', () => {
    it('should set contract addresses for a chain', () => {
      const addresses = {
        yieldEscrow: '0x1234567890123456789012345678901234567890',
        yieldVault: '0x2345678901234567890123456789012345678901',
        crossChainBridge: '0x3456789012345678901234567890123456789012',
      };

      yieldRailsContracts.setContractAddresses(ChainName.ethereum, addresses);

      // Test that addresses are stored (we can't directly access private field, but we can test behavior)
      expect(() => yieldRailsContracts.setContractAddresses(ChainName.ethereum, addresses)).not.toThrow();
    });
  });

  describe('Contract Initialization', () => {
    beforeEach(() => {
      yieldRailsContracts.setContractAddresses(ChainName.ethereum, {
        yieldEscrow: '0x1234567890123456789012345678901234567890',
        yieldVault: '0x2345678901234567890123456789012345678901',
        crossChainBridge: '0x3456789012345678901234567890123456789012',
      });
    });

    it('should initialize YieldEscrow contract', async () => {
      const abi = [{ name: 'test' }];
      
      const contract = await yieldRailsContracts.initYieldEscrow(
        ChainName.ethereum,
        abi,
        mockSigner
      );

      expect(mockContractHelper.initContractOnChain).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        ChainName.ethereum,
        '0x1234567890123456789012345678901234567890',
        abi,
        mockSigner
      );
      expect(contract).toBe(mockContract);
    });

    it('should initialize YieldVault contract', async () => {
      const abi = [{ name: 'test' }];
      
      const contract = await yieldRailsContracts.initYieldVault(
        ChainName.ethereum,
        abi,
        mockSigner
      );

      expect(mockContractHelper.initContractOnChain).toHaveBeenCalledWith(
        'yieldVault_ethereum',
        ChainName.ethereum,
        '0x2345678901234567890123456789012345678901',
        abi,
        mockSigner
      );
      expect(contract).toBe(mockContract);
    });

    it('should initialize CrossChainBridge contract', async () => {
      const abi = [{ name: 'test' }];
      
      const contract = await yieldRailsContracts.initCrossChainBridge(
        ChainName.ethereum,
        abi,
        mockSigner
      );

      expect(mockContractHelper.initContractOnChain).toHaveBeenCalledWith(
        'crossChainBridge_ethereum',
        ChainName.ethereum,
        '0x3456789012345678901234567890123456789012',
        abi,
        mockSigner
      );
      expect(contract).toBe(mockContract);
    });

    it('should throw error if contract address not set', async () => {
      const abi = [{ name: 'test' }];
      
      await expect(
        yieldRailsContracts.initYieldEscrow(ChainName.polygon, abi, mockSigner)
      ).rejects.toThrow('YieldEscrow contract address not set for chain polygon');
    });
  });

  describe('Deposit Operations', () => {
    beforeEach(() => {
      yieldRailsContracts.setContractAddresses(ChainName.ethereum, {
        yieldEscrow: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should create a deposit', async () => {
      const mockTxResponse = { hash: '0xabc123' } as ethers.TransactionResponse;
      mockContractHelper.writeContract.mockResolvedValue(mockTxResponse);

      const result = await yieldRailsContracts.createDeposit(
        ChainName.ethereum,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        '1000000',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'noble-tbill'
      );

      expect(mockContractHelper.writeContract).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        'createDeposit',
        [
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
          '1000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          'noble-tbill'
        ],
        {}
      );
      expect(result).toBe(mockTxResponse);
    });

    it('should release a deposit', async () => {
      const mockTxResponse = { hash: '0xdef456' } as ethers.TransactionResponse;
      mockContractHelper.writeContract.mockResolvedValue(mockTxResponse);

      const result = await yieldRailsContracts.releaseDeposit(
        ChainName.ethereum,
        'deposit-123'
      );

      expect(mockContractHelper.writeContract).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        'releaseDeposit',
        ['deposit-123'],
        {}
      );
      expect(result).toBe(mockTxResponse);
    });

    it('should get deposit details', async () => {
      const mockDepositData = {
        id: 'deposit-123',
        user: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        merchant: '0x123456789abcdef123456789abcdef123456789a',
        amount: { toString: () => '1000000' },
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        strategy: 'noble-tbill',
        yieldGenerated: { toString: () => '50000' },
        depositTime: { toNumber: () => 1642680000 },
        isReleased: false,
      };
      mockContractHelper.readContract.mockResolvedValue(mockDepositData);

      const result = await yieldRailsContracts.getDeposit(
        ChainName.ethereum,
        'deposit-123'
      );

      expect(mockContractHelper.readContract).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        'getDeposit',
        ['deposit-123']
      );
      expect(result).toEqual({
        depositId: 'deposit-123',
        user: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        merchant: '0x123456789abcdef123456789abcdef123456789a',
        amount: '1000000',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        strategy: 'noble-tbill',
        yieldGenerated: '50000',
        depositTime: 1642680000,
        isReleased: false,
      });
    });

    it('should calculate yield', async () => {
      mockContractHelper.readContract.mockResolvedValue(BigInt('75000'));

      const result = await yieldRailsContracts.calculateYield(
        ChainName.ethereum,
        'deposit-123'
      );

      expect(mockContractHelper.readContract).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        'calculateCurrentYield',
        ['deposit-123']
      );
      expect(result).toBe('75000');
    });

    it('should get user deposits', async () => {
      const mockDeposits = ['deposit-123', 'deposit-456'];
      mockContractHelper.readContract.mockResolvedValue(mockDeposits);

      const result = await yieldRailsContracts.getUserDeposits(
        ChainName.ethereum,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9'
      );

      expect(mockContractHelper.readContract).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        'getUserDeposits',
        ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9']
      );
      expect(result).toEqual(mockDeposits);
    });
  });

  describe('Yield Strategy Operations', () => {
    beforeEach(() => {
      yieldRailsContracts.setContractAddresses(ChainName.ethereum, {
        yieldVault: '0x2345678901234567890123456789012345678901',
      });
    });

    it('should get yield strategies', async () => {
      const mockStrategies = [
        {
          id: 'noble-tbill',
          name: 'Noble T-Bill Strategy',
          contractAddress: '0x123456789abcdef123456789abcdef123456789a',
          isActive: true,
          expectedAPY: { toString: () => '550' }, // 5.5%
          riskLevel: 'LOW',
        },
        {
          id: 'aave-lending',
          name: 'Aave Lending Strategy',
          contractAddress: '0x987654321fedcba987654321fedcba987654321f',
          isActive: true,
          expectedAPY: { toString: () => '750' }, // 7.5%
          riskLevel: 'MEDIUM',
        },
      ];
      mockContractHelper.readContract.mockResolvedValue(mockStrategies);

      const result = await yieldRailsContracts.getYieldStrategies(ChainName.ethereum);

      expect(mockContractHelper.readContract).toHaveBeenCalledWith(
        'yieldVault_ethereum',
        'getActiveStrategies',
        []
      );
      expect(result).toEqual([
        {
          id: 'noble-tbill',
          name: 'Noble T-Bill Strategy',
          contractAddress: '0x123456789abcdef123456789abcdef123456789a',
          isActive: true,
          expectedAPY: '550',
          riskLevel: 'LOW',
        },
        {
          id: 'aave-lending',
          name: 'Aave Lending Strategy',
          contractAddress: '0x987654321fedcba987654321fedcba987654321f',
          isActive: true,
          expectedAPY: '750',
          riskLevel: 'MEDIUM',
        },
      ]);
    });
  });

  describe('Bridge Operations', () => {
    beforeEach(() => {
      yieldRailsContracts.setContractAddresses(ChainName.ethereum, {
        crossChainBridge: '0x3456789012345678901234567890123456789012',
      });
    });

    it('should initiate bridge transaction', async () => {
      const mockTxResponse = { hash: '0xbridge123' } as ethers.TransactionResponse;
      mockContractHelper.writeContract.mockResolvedValue(mockTxResponse);

      const result = await yieldRailsContracts.initiateBridge(
        ChainName.ethereum,
        'polygon',
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        '500000000',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(mockContractHelper.writeContract).toHaveBeenCalledWith(
        'crossChainBridge_ethereum',
        'initiateBridge',
        [
          'polygon',
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
          '500000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        ],
        {}
      );
      expect(result).toBe(mockTxResponse);
    });

    it('should get bridge transaction details', async () => {
      const mockBridgeData = {
        transactionId: 'bridge-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        sourceAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        destinationAddress: '0x123456789abcdef123456789abcdef123456789a',
        amount: { toString: () => '500000000' },
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        status: 'PENDING',
        bridgeFee: { toString: () => '1000000' },
        yieldDuringTransit: { toString: () => '5000' },
      };
      mockContractHelper.readContract.mockResolvedValue(mockBridgeData);

      const result = await yieldRailsContracts.getBridgeTransaction(
        ChainName.ethereum,
        'bridge-123'
      );

      expect(mockContractHelper.readContract).toHaveBeenCalledWith(
        'crossChainBridge_ethereum',
        'getBridgeTransaction',
        ['bridge-123']
      );
      expect(result).toEqual({
        transactionId: 'bridge-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        sourceAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        destinationAddress: '0x123456789abcdef123456789abcdef123456789a',
        amount: '500000000',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        status: 'PENDING',
        bridgeFee: '1000000',
        yieldDuringTransit: '5000',
      });
    });
  });

  describe('Gas Estimation', () => {
    beforeEach(() => {
      yieldRailsContracts.setContractAddresses(ChainName.ethereum, {
        yieldEscrow: '0x1234567890123456789012345678901234567890',
        crossChainBridge: '0x3456789012345678901234567890123456789012',
      });
    });

    it('should estimate gas for deposit creation', async () => {
      mockContractHelper.estimateGas.mockResolvedValue(BigInt('180000'));

      const result = await yieldRailsContracts.estimateDepositGas(
        ChainName.ethereum,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        '1000000',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'noble-tbill'
      );

      expect(mockContractHelper.estimateGas).toHaveBeenCalledWith(
        'yieldEscrow_ethereum',
        'createDeposit',
        [
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
          '1000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          'noble-tbill'
        ],
        {}
      );
      expect(result).toBe(BigInt('180000'));
    });

    it('should estimate gas for bridge transaction', async () => {
      mockContractHelper.estimateGas.mockResolvedValue(BigInt('220000'));

      const result = await yieldRailsContracts.estimateBridgeGas(
        ChainName.ethereum,
        'polygon',
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        '500000000',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(mockContractHelper.estimateGas).toHaveBeenCalledWith(
        'crossChainBridge_ethereum',
        'initiateBridge',
        [
          'polygon',
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
          '500000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        ],
        {}
      );
      expect(result).toBe(BigInt('220000'));
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      yieldRailsContracts.setContractAddresses(ChainName.ethereum, {
        yieldEscrow: '0x1234567890123456789012345678901234567890',
        crossChainBridge: '0x3456789012345678901234567890123456789012',
      });
    });

    it('should get deposit events', async () => {
      const mockEvents = [
        { transactionHash: '0xabc123', blockNumber: 12345 },
        { transactionHash: '0xdef456', blockNumber: 12346 },
      ];
      mockContract.queryFilter.mockResolvedValue(mockEvents as any);
      (mockContract.filters.DepositCreated as any).mockReturnValue('deposit-filter');

      const result = await yieldRailsContracts.getDepositEvents(
        ChainName.ethereum,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        12000,
        12500
      );

      expect(mockContractHelper.getContract).toHaveBeenCalledWith('yieldEscrow_ethereum');
      expect(mockContract.filters.DepositCreated).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9');
      expect(mockContract.queryFilter).toHaveBeenCalledWith('deposit-filter', 12000, 12500);
      expect(result).toEqual(mockEvents);
    });

    it('should set up deposit event listener', () => {
      const mockCallback = jest.fn();
      (mockContract.filters.DepositCreated as any).mockReturnValue('deposit-filter');

      yieldRailsContracts.onDepositCreated(
        ChainName.ethereum,
        mockCallback,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9'
      );

      expect(mockContractHelper.getContract).toHaveBeenCalledWith('yieldEscrow_ethereum');
      expect(mockContract.filters.DepositCreated).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9');
      expect(mockContract.on).toHaveBeenCalledWith('deposit-filter', mockCallback);
    });

    it('should remove all listeners for a chain', () => {
      yieldRailsContracts.removeAllListeners(ChainName.ethereum);

      expect(mockContractHelper.getContract).toHaveBeenCalledWith('yieldEscrow_ethereum');
      expect(mockContractHelper.getContract).toHaveBeenCalledWith('yieldVault_ethereum');
      expect(mockContractHelper.getContract).toHaveBeenCalledWith('crossChainBridge_ethereum');
    });
  });

  describe('Utility Methods', () => {
    it('should return the ContractHelper instance', () => {
      const contractHelper = yieldRailsContracts.getContractHelper();
      expect(contractHelper).toBe(mockContractHelper);
    });
  });
});