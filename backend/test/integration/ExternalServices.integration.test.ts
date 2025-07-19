import { CircleCCTPService } from '../../src/services/external/CircleCCTPService';
import { ChainalysisService } from '../../src/services/external/ChainalysisService';
import { MoonPayService } from '../../src/services/external/MoonPayService';
import { config } from '../../src/config/environment';

// These tests will be skipped if API keys are not configured
const runCircleTests = !!config.CIRCLE_API_KEY;
const runChainalysisTests = !!config.CHAINALYSIS_API_KEY;
const runMoonPayTests = !!process.env.MOONPAY_API_KEY;

// Test addresses
const TEST_ETH_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'; // Example address
const TEST_USDC_AMOUNT = '10'; // Small amount for testing

describe('External Services Integration Tests', () => {
  
  describe('CircleCCTPService', () => {
    let circleCCTPService: CircleCCTPService;
    
    beforeAll(() => {
      circleCCTPService = new CircleCCTPService();
    });
    
    // Skip tests if API key is not configured
    const testOrSkip = runCircleTests ? test : test.skip;
    
    testOrSkip('should estimate transfer fee', async () => {
      const fee = await circleCCTPService.estimateTransferFee(
        '1', // Ethereum
        '137', // Polygon
        TEST_USDC_AMOUNT
      );
      
      expect(fee).toBeDefined();
      expect(parseFloat(fee)).toBeGreaterThanOrEqual(0);
    });
    
    testOrSkip('should get supported chains', async () => {
      const chains = await circleCCTPService.getSupportedChains();
      
      expect(chains).toBeDefined();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
    });
  });
  
  describe('ChainalysisService', () => {
    let chainalysisService: ChainalysisService;
    
    beforeAll(() => {
      chainalysisService = new ChainalysisService();
    });
    
    // Skip tests if API key is not configured
    const testOrSkip = runChainalysisTests ? test : test.skip;
    
    testOrSkip('should check address risk', async () => {
      const risk = await chainalysisService.checkAddressRisk(TEST_ETH_ADDRESS);
      
      expect(risk).toBeDefined();
      expect(risk.address).toBe(TEST_ETH_ADDRESS);
      expect(risk.riskScore).toBeGreaterThanOrEqual(0);
      expect(risk.riskScore).toBeLessThanOrEqual(100);
    });
    
    testOrSkip('should check transaction risk', async () => {
      const risk = await chainalysisService.checkTransactionRisk({
        transactionId: 'test-tx-id',
        sourceAddress: TEST_ETH_ADDRESS,
        destinationAddress: '0x1234567890123456789012345678901234567890',
        amount: '100',
        currency: 'USDC'
      });
      
      expect(risk).toBeDefined();
      expect(risk.transactionId).toBe('test-tx-id');
      expect(risk.riskScore).toBeGreaterThanOrEqual(0);
      expect(risk.riskScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(risk.flags)).toBe(true);
      expect(Array.isArray(risk.recommendations)).toBe(true);
    });
    
    testOrSkip('should check sanctions list', async () => {
      const result = await chainalysisService.checkSanctionsList('John Doe');
      
      expect(result).toBeDefined();
      expect(typeof result.isMatch).toBe('boolean');
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });
  
  describe('MoonPayService', () => {
    let moonPayService: MoonPayService;
    
    beforeAll(() => {
      moonPayService = new MoonPayService();
    });
    
    // Skip tests if API key is not configured
    const testOrSkip = runMoonPayTests ? test : test.skip;
    
    testOrSkip('should generate widget URL', () => {
      const url = moonPayService.generateWidgetUrl({
        currencyCode: 'USDC',
        walletAddress: TEST_ETH_ADDRESS,
        baseCurrencyCode: 'USD',
        baseCurrencyAmount: 100
      });
      
      expect(url).toBeDefined();
      expect(url).toContain('https://');
      expect(url).toContain('currencyCode=USDC');
      expect(url).toContain('walletAddress=');
    });
    
    testOrSkip('should get supported currencies', async () => {
      const currencies = await moonPayService.getSupportedCurrencies();
      
      expect(currencies).toBeDefined();
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies.length).toBeGreaterThan(0);
    });
    
    testOrSkip('should get buy quote', async () => {
      const quote = await moonPayService.getBuyQuote('USD', 'USDC', 100);
      
      expect(quote).toBeDefined();
    });
  });
});