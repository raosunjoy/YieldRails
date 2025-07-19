/**
 * Tests for ContractHelper
 */

import { ContractHelper } from '../contract-helper';
import { ethers } from 'ethers';
import { ChainName } from '../../types/common';

// Mock ethers
jest.mock('ethers', () => {
  const originalModule = jest.requireActual('ethers');
  
  // Mock JsonRpcProvider
  const mockJsonRpcProvider = jest.fn().mockImplementation(() => ({
    waitForTransaction: jest.fn().mockResolvedValue({ status: 1 }),
  }));
  
  // Mock Contract
  const mockContract = jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockReturnThis(),
    estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
    // Add mock methods that will be called dynamically
    mockMethod: jest.fn().mockResolvedValue('result'),
    mockWriteMethod: jest.fn().mockResolvedValue({ hash: '0xabc123' }),
  }));
  
  return {
    ...originalModule,
    JsonRpcProvider: mockJsonRpcProvider,
    Contract: mockContract,
  };
});

describe('ContractHelper', () => {
  let contractHelper: ContractHelper;
  
  beforeEach(() => {
    contractHelper = new ContractHelper();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Provider management', () => {
    it('should get provider for supported chain', () => {
      const provider = contractHelper.getProvider(ChainName.ethereum);
      expect(provider).toBeDefined();
      expect(ethers.JsonRpcProvider).toHaveBeenCalled();
    });
    
    it('should throw error for unsupported chain', () => {
      // @ts-ignore - Testing invalid chain
      expect(() => contractHelper.getProvider('invalid-chain')).toThrow();
    });
    
    it('should throw error for non-EVM chains', () => {
      expect(() => contractHelper.getProvider(ChainName.xrpl)).toThrow();
      expect(() => contractHelper.getProvider(ChainName.solana)).toThrow();
    });
    
    it('should set custom provider', () => {
      const mockProvider = new ethers.JsonRpcProvider();
      contractHelper.setProvider(ChainName.ethereum, mockProvider);
      
      const provider = contractHelper.getProvider(ChainName.ethereum);
      expect(provider).toBe(mockProvider);
    });
    
    it('should set custom chain config', () => {
      const customConfig = {
        rpcUrl: 'https://custom-rpc.example.com',
        chainId: 1337,
        name: 'Custom Chain',
        blockExplorer: 'https://explorer.example.com',
      };
      
      contractHelper.setChainConfig(ChainName.ethereum, customConfig);
      const config = contractHelper.getChainConfig(ChainName.ethereum);
      
      expect(config).toEqual(customConfig);
    });
  });
  
  describe('Contract management', () => {
    const mockAbi = [{ name: 'mockMethod', type: 'function', inputs: [], outputs: [{ type: 'string' }] }];
    const mockAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9';
    
    it('should initialize contract', () => {
      const contract = contractHelper.initContract('test-contract', {
        address: mockAddress,
        abi: mockAbi,
      });
      
      expect(contract).toBeDefined();
      expect(ethers.Contract).toHaveBeenCalledWith(
        mockAddress,
        mockAbi,
        expect.anything()
      );
    });
    
    it('should initialize contract on specific chain', () => {
      const contract = contractHelper.initContractOnChain(
        'test-contract',
        ChainName.ethereum,
        mockAddress,
        mockAbi
      );
      
      expect(contract).toBeDefined();
      expect(ethers.Contract).toHaveBeenCalledWith(
        mockAddress,
        mockAbi,
        expect.anything()
      );
    });
    
    it('should get initialized contract', () => {
      contractHelper.initContract('test-contract', {
        address: mockAddress,
        abi: mockAbi,
      });
      
      const contract = contractHelper.getContract('test-contract');
      expect(contract).toBeDefined();
    });
    
    it('should throw error for uninitialized contract', () => {
      expect(() => contractHelper.getContract('non-existent')).toThrow();
    });
    
    it('should connect contract with signer', () => {
      const mockSigner = {} as ethers.Signer;
      
      contractHelper.initContract('test-contract', {
        address: mockAddress,
        abi: mockAbi,
      });
      
      const contract = contractHelper.connectContractWithSigner('test-contract', mockSigner);
      expect(contract).toBeDefined();
      expect(contract.connect).toHaveBeenCalledWith(mockSigner);
    });
  });
  
  describe('Contract interactions', () => {
    const mockAbi = [{ name: 'mockMethod', type: 'function', inputs: [], outputs: [{ type: 'string' }] }];
    const mockAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9';
    
    beforeEach(() => {
      contractHelper.initContract('test-contract', {
        address: mockAddress,
        abi: mockAbi,
      });
    });
    
    it('should read from contract', async () => {
      const result = await contractHelper.readContract<string>(
        'test-contract',
        'mockMethod',
        []
      );
      
      expect(result).toBe('result');
    });
    
    it('should write to contract', async () => {
      const result = await contractHelper.writeContract(
        'test-contract',
        'mockWriteMethod',
        ['arg1', 'arg2'],
        { gasLimit: 200000 }
      );
      
      expect(result).toEqual({ hash: '0xabc123' });
    });
    
    it('should estimate gas', async () => {
      const gas = await contractHelper.estimateGas(
        'test-contract',
        'mockMethod',
        ['arg1']
      );
      
      expect(gas).toBe(BigInt(100000));
    });
    
    it('should wait for transaction', async () => {
      const receipt = await contractHelper.waitForTransaction(
        ChainName.ethereum,
        '0xabc123',
        2
      );
      
      expect(receipt).toEqual({ status: 1 });
    });
  });
  
  describe('Utility methods', () => {
    it('should get explorer URL for transaction', () => {
      const url = contractHelper.getExplorerUrl(
        ChainName.ethereum,
        '0xabc123'
      );
      
      expect(url).toBe('https://etherscan.io/tx/0xabc123');
    });
    
    it('should get explorer URL for address', () => {
      const url = contractHelper.getAddressExplorerUrl(
        ChainName.ethereum,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9'
      );
      
      expect(url).toBe('https://etherscan.io/address/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9');
    });
    
    it('should get supported chains', () => {
      const chains = contractHelper.getSupportedChains();
      expect(chains).toContain(ChainName.ethereum);
      expect(chains).toContain(ChainName.polygon);
      expect(chains).toContain(ChainName.arbitrum);
    });
  });
});