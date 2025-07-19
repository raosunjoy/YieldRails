import { CircleCCTPService } from '../../../src/services/external/CircleCCTPService';
import axios from 'axios';
import { config } from '../../../src/config/environment';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock config
jest.mock('../../../src/config/environment', () => ({
  config: {
    CIRCLE_API_KEY: 'test-api-key',
    CIRCLE_API_URL: 'https://api.circle.com'
  }
}));

describe('CircleCCTPService', () => {
  let circleCCTPService: CircleCCTPService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    circleCCTPService = new CircleCCTPService();
    
    // Mock axios create to return mocked axios
    (axios.create as jest.Mock).mockReturnValue(mockedAxios);
  });
  
  describe('initiateTransfer', () => {
    it('should successfully initiate a transfer', async () => {
      // Mock response
      const mockResponse = {
        data: {
          id: 'transfer-123',
          status: 'pending',
          sourceTransactionHash: '0x123',
          destinationTransactionHash: null,
          attestation: null,
          fee: '1.5',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const request = {
        sourceChain: '1',
        destinationChain: '137',
        amount: '100',
        sourceAddress: '0x123456789abcdef',
        destinationAddress: '0xabcdef123456789',
        tokenSymbol: 'USDC'
      };
      
      const result = await circleCCTPService.initiateTransfer(request);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/v1/transfers', expect.any(Object));
      expect(result).toEqual({
        id: 'transfer-123',
        status: 'pending',
        sourceChain: '1',
        destinationChain: '137',
        amount: '100',
        fee: '1.5',
        sourceTransactionHash: '0x123',
        destinationTransactionHash: null,
        attestation: null,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      });
    });
    
    it('should throw error when validation fails', async () => {
      const request = {
        sourceChain: '1',
        destinationChain: '137',
        amount: '0', // Invalid amount
        sourceAddress: '0x123456789abcdef',
        destinationAddress: '0xabcdef123456789',
        tokenSymbol: 'USDC'
      };
      
      await expect(circleCCTPService.initiateTransfer(request)).rejects.toThrow('Valid amount is required');
    });
  });
  
  describe('getTransferStatus', () => {
    it('should get transfer status', async () => {
      // Mock response
      const mockResponse = {
        data: {
          id: 'transfer-123',
          status: 'complete',
          sourceTransactionHash: '0x123',
          destinationTransactionHash: '0x456',
          attestation: '0xabc',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await circleCCTPService.getTransferStatus('transfer-123');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/transfers/transfer-123');
      expect(result).toEqual({
        id: 'transfer-123',
        status: 'complete',
        sourceTransactionHash: '0x123',
        destinationTransactionHash: '0x456',
        attestation: '0xabc',
        updatedAt: '2023-01-01T00:00:00Z'
      });
    });
  });
  
  describe('getTransferAttestation', () => {
    it('should get transfer attestation for completed transfer', async () => {
      // Mock getTransferStatus response
      const mockStatus = {
        id: 'transfer-123',
        status: 'complete',
        sourceTransactionHash: '0x123',
        destinationTransactionHash: '0x456',
        attestation: '0xabc',
        updatedAt: '2023-01-01T00:00:00Z'
      };
      
      // Mock the getTransferStatus method
      jest.spyOn(circleCCTPService, 'getTransferStatus').mockResolvedValueOnce(mockStatus);
      
      const result = await circleCCTPService.getTransferAttestation('transfer-123');
      
      expect(circleCCTPService.getTransferStatus).toHaveBeenCalledWith('transfer-123');
      expect(result).toBe('0xabc');
    });
    
    it('should throw error when transfer is not complete', async () => {
      // Mock getTransferStatus response
      const mockStatus = {
        id: 'transfer-123',
        status: 'pending',
        sourceTransactionHash: '0x123',
        destinationTransactionHash: null,
        attestation: null,
        updatedAt: '2023-01-01T00:00:00Z'
      };
      
      // Mock the getTransferStatus method
      jest.spyOn(circleCCTPService, 'getTransferStatus').mockResolvedValueOnce(mockStatus);
      
      await expect(circleCCTPService.getTransferAttestation('transfer-123')).rejects.toThrow(
        'Transfer transfer-123 is not complete. Current status: pending'
      );
    });
  });
  
  describe('estimateTransferFee', () => {
    it('should estimate transfer fee', async () => {
      // Mock response
      const mockResponse = {
        data: {
          fee: '1.5'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await circleCCTPService.estimateTransferFee('1', '137', '100');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/fee-estimate', {
        params: {
          sourceChain: 'ethereum',
          destinationChain: 'polygon',
          amount: '100'
        }
      });
      expect(result).toBe('1.5');
    });
  });
  
  describe('getSupportedChains', () => {
    it('should get supported chains', async () => {
      // Mock response
      const mockResponse = {
        data: {
          chains: [
            { id: 'ethereum', name: 'Ethereum' },
            { id: 'polygon', name: 'Polygon' }
          ]
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await circleCCTPService.getSupportedChains();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/supported-chains');
      expect(result).toEqual([
        { id: 'ethereum', name: 'Ethereum' },
        { id: 'polygon', name: 'Polygon' }
      ]);
    });
  });
});