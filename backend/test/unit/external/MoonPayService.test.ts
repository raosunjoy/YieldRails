import { MoonPayService } from '../../../src/services/external/MoonPayService';
import axios from 'axios';
import * as crypto from 'crypto';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock crypto
jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-signature')
  })
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    MOONPAY_API_KEY: 'test-api-key',
    MOONPAY_SECRET_KEY: 'test-secret-key',
    MOONPAY_API_URL: 'https://api.moonpay.com',
    MOONPAY_WIDGET_URL: 'https://buy.moonpay.com'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('MoonPayService', () => {
  let moonPayService: MoonPayService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    moonPayService = new MoonPayService();
    
    // Mock axios create to return mocked axios
    (axios.create as jest.Mock).mockReturnValue(mockedAxios);
  });
  
  describe('generateWidgetUrl', () => {
    it('should generate a signed widget URL', () => {
      const request = {
        currencyCode: 'USDC',
        walletAddress: '0x123456789abcdef',
        baseCurrencyCode: 'USD',
        baseCurrencyAmount: 100,
        email: 'user@example.com',
        showWalletAddressForm: false,
        redirectURL: 'https://example.com/callback'
      };
      
      const result = moonPayService.generateWidgetUrl(request);
      
      expect(result).toContain('https://buy.moonpay.com?');
      expect(result).toContain('apiKey=test-api-key');
      expect(result).toContain('currencyCode=USDC');
      expect(result).toContain('walletAddress=0x123456789abcdef');
      expect(result).toContain('signature=mocked-signature');
    });
    
    it('should generate URL without signature when secret key is not available', () => {
      process.env.MOONPAY_SECRET_KEY = '';
      const moonPayServiceNoSecret = new MoonPayService();
      
      const request = {
        currencyCode: 'USDC',
        walletAddress: '0x123456789abcdef'
      };
      
      const result = moonPayServiceNoSecret.generateWidgetUrl(request);
      
      expect(result).toContain('https://buy.moonpay.com?');
      expect(result).toContain('apiKey=test-api-key');
      expect(result).toContain('currencyCode=USDC');
      expect(result).toContain('walletAddress=0x123456789abcdef');
      expect(result).not.toContain('signature=');
    });
  });
  
  describe('getTransaction', () => {
    it('should get transaction details', async () => {
      // Mock response
      const mockResponse = {
        data: {
          id: 'tx-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          baseCurrencyAmount: 100,
          quoteCurrencyAmount: 100,
          feeAmount: 4.99,
          extraFeeAmount: 0,
          networkFeeAmount: 0.5,
          areFeesIncluded: true,
          status: 'completed',
          failureReason: null,
          walletAddress: '0x123456789abcdef',
          walletAddressTag: null,
          cryptoTransactionId: '0xabc',
          returnUrl: null,
          redirectUrl: 'https://example.com/callback',
          widgetRedirectUrl: null,
          eurRate: 0.85,
          usdRate: 1,
          gbpRate: 0.75,
          baseCurrency: {
            id: 'usd',
            name: 'US Dollar',
            code: 'USD',
            precision: 2
          },
          quoteCurrency: {
            id: 'usdc',
            name: 'USD Coin',
            code: 'USDC',
            precision: 6
          },
          customerId: 'customer-123',
          cardId: null,
          bankAccountId: null,
          bankDepositInformation: null,
          bankTransferReference: null,
          externalTransactionId: 'ext-123',
          externalCustomerId: 'ext-customer-123'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await moonPayService.getTransaction('tx-123');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/transactions/tx-123');
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('getTransactionsByCustomer', () => {
    it('should get transactions by customer ID', async () => {
      // Mock response
      const mockResponse = {
        data: [
          {
            id: 'tx-123',
            status: 'completed',
            baseCurrencyAmount: 100,
            quoteCurrencyAmount: 100
          },
          {
            id: 'tx-456',
            status: 'pending',
            baseCurrencyAmount: 200,
            quoteCurrencyAmount: 200
          }
        ]
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await moonPayService.getTransactionsByCustomer('ext-customer-123');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/transactions', {
        params: {
          externalCustomerId: 'ext-customer-123'
        }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('getSupportedCurrencies', () => {
    it('should get all supported currencies', async () => {
      // Mock response
      const mockResponse = {
        data: [
          {
            id: 'usdc',
            name: 'USD Coin',
            code: 'USDC',
            precision: 6,
            minAmount: 20,
            maxAmount: 10000,
            type: 'crypto',
            networks: [
              {
                id: 'ethereum',
                name: 'Ethereum',
                code: 'ETH'
              }
            ]
          },
          {
            id: 'usd',
            name: 'US Dollar',
            code: 'USD',
            precision: 2,
            minAmount: 20,
            maxAmount: 10000,
            type: 'fiat',
            networks: []
          }
        ]
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await moonPayService.getSupportedCurrencies();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/currencies', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });
    
    it('should get filtered currencies by type', async () => {
      // Mock response
      const mockResponse = {
        data: [
          {
            id: 'usdc',
            name: 'USD Coin',
            code: 'USDC',
            type: 'crypto'
          }
        ]
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await moonPayService.getSupportedCurrencies('crypto');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v1/currencies', { 
        params: { type: 'crypto' } 
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('getBuyQuote', () => {
    it('should get buy quote', async () => {
      // Mock response
      const mockResponse = {
        data: {
          baseCurrencyAmount: 100,
          quoteCurrencyAmount: 99.5,
          feeAmount: 4.99,
          networkFeeAmount: 0.5,
          totalAmount: 105.49
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await moonPayService.getBuyQuote('USD', 'USDC', 100);
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/v3/currencies/quote', {
        params: {
          baseCurrencyCode: 'USD',
          quoteCurrencyCode: 'USDC',
          baseCurrencyAmount: 100,
          areFeesIncluded: true
        }
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ event: 'transaction_completed' });
      const signature = 'mocked-signature';
      
      const result = moonPayService.verifyWebhookSignature(payload, signature);
      
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'test-secret-key');
      expect(result).toBe(true);
    });
    
    it('should return false when secret key is not available', () => {
      process.env.MOONPAY_SECRET_KEY = '';
      const moonPayServiceNoSecret = new MoonPayService();
      
      const payload = JSON.stringify({ event: 'transaction_completed' });
      const signature = 'mocked-signature';
      
      const result = moonPayServiceNoSecret.verifyWebhookSignature(payload, signature);
      
      expect(result).toBe(false);
    });
  });
});