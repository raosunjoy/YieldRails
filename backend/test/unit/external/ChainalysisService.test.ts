import { ChainalysisService } from '../../../src/services/external/ChainalysisService';
import axios from 'axios';
import { config } from '../../../src/config/environment';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock config
jest.mock('../../../src/config/environment', () => ({
  config: {
    CHAINALYSIS_API_KEY: 'test-api-key',
    CHAINALYSIS_API_URL: 'https://api.chainalysis.com'
  }
}));

describe('ChainalysisService', () => {
  let chainalysisService: ChainalysisService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    chainalysisService = new ChainalysisService();
    
    // Mock axios create to return mocked axios
    (axios.create as jest.Mock).mockReturnValue(mockedAxios);
  });
  
  describe('checkAddressRisk', () => {
    it('should successfully check address risk', async () => {
      // Mock response
      const mockResponse = {
        data: {
          address: '0x123456789abcdef',
          riskScore: 75,
          sanctions: true,
          pep: false,
          flags: ['HIGH_VOLUME', 'MIXER'],
          category: 'exchange'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await chainalysisService.checkAddressRisk('0x123456789abcdef');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/address/0x123456789abcdef');
      expect(result).toEqual(expect.objectContaining({
        address: '0x123456789abcdef',
        riskLevel: 'HIGH',
        sanctions: true,
        pep: false,
        amlFlags: ['HIGH_VOLUME', 'MIXER'],
        category: 'exchange',
        source: 'chainalysis'
      }));
    });
    
    it('should return mock data when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API error'));
      
      const result = await chainalysisService.checkAddressRisk('0x123456789abcdef');
      
      expect(result).toEqual(expect.objectContaining({
        address: '0x123456789abcdef',
        source: 'mock'
      }));
    });
  });
  
  describe('checkTransactionRisk', () => {
    it('should successfully check transaction risk', async () => {
      // Mock checkAddressRisk responses
      jest.spyOn(chainalysisService, 'checkAddressRisk')
        .mockResolvedValueOnce({
          address: '0xsource',
          riskScore: 30,
          riskLevel: 'MEDIUM',
          sanctions: false,
          pep: false,
          amlFlags: [],
          source: 'chainalysis',
          lastChecked: new Date()
        })
        .mockResolvedValueOnce({
          address: '0xdestination',
          riskScore: 80,
          riskLevel: 'VERY_HIGH',
          sanctions: true,
          pep: false,
          amlFlags: ['DARKNET'],
          source: 'chainalysis',
          lastChecked: new Date()
        });
      
      const transaction = {
        transactionId: 'tx-123',
        sourceAddress: '0xsource',
        destinationAddress: '0xdestination',
        amount: '10000',
        currency: 'USDC'
      };
      
      const result = await chainalysisService.checkTransactionRisk(transaction);
      
      expect(chainalysisService.checkAddressRisk).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expect.objectContaining({
        transactionId: 'tx-123',
        sourceAddress: '0xsource',
        destinationAddress: '0xdestination',
        riskLevel: 'HIGH',
        flags: expect.arrayContaining(['HIGH_RISK_ADDRESS', 'SANCTIONS_MATCH'])
      }));
    });
  });
  
  describe('checkSanctionsList', () => {
    it('should successfully check sanctions list', async () => {
      // Mock response
      const mockResponse = {
        data: {
          isMatch: true,
          matches: [
            {
              name: 'John Doe',
              listName: 'OFAC',
              confidence: 0.95,
              matchType: 'name'
            }
          ],
          confidence: 0.95
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await chainalysisService.checkSanctionsList('John Doe', '0x123456789abcdef');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/v1/sanctions-screening', {
        name: 'John Doe',
        address: '0x123456789abcdef'
      });
      expect(result).toEqual(expect.objectContaining({
        name: 'John Doe',
        address: '0x123456789abcdef',
        isMatch: true,
        matches: expect.any(Array),
        confidence: 0.95
      }));
    });
    
    it('should return mock data when API call fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API error'));
      
      const result = await chainalysisService.checkSanctionsList('John Doe');
      
      expect(result).toEqual(expect.objectContaining({
        name: 'John Doe',
        isMatch: expect.any(Boolean),
        matches: expect.any(Array),
        confidence: expect.any(Number)
      }));
    });
  });
  
  describe('getSupportedCurrencies', () => {
    it('should get supported currencies', async () => {
      // Mock response
      const mockResponse = {
        data: {
          currencies: ['BTC', 'ETH', 'USDC', 'USDT']
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await chainalysisService.getSupportedCurrencies();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/supported-currencies');
      expect(result).toEqual(['BTC', 'ETH', 'USDC', 'USDT']);
    });
    
    it('should return default currencies when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API error'));
      
      const result = await chainalysisService.getSupportedCurrencies();
      
      expect(result).toEqual(['BTC', 'ETH', 'USDC', 'USDT', 'DAI']);
    });
  });
});