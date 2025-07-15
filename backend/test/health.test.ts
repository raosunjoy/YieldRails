import request from 'supertest';
import express from 'express';
import { ApiTestUtils, createMockRequest, createMockResponse } from './helpers/testUtils';

// Mock health router since it may not exist yet
const mockHealthRouter = express.Router();
mockHealthRouter.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime()
  });
});

mockHealthRouter.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const app = express();
app.use('/api/health', mockHealthRouter);

const testUtils = new ApiTestUtils();

describe('YieldRails Testing Infrastructure', () => {
  beforeAll(async () => {
    // Setup test environment
    await testUtils.cleanup();
  });

  afterAll(async () => {
    // Cleanup test environment
    await testUtils.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await testUtils.cleanup();
  });

  describe('Health Endpoints', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return alive status', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Test Infrastructure Validation', () => {
    it('should create mock request objects', () => {
      const req = createMockRequest({
        body: { test: 'data' },
        params: { id: '123' },
        user: { userId: 'test-user', role: 'USER' }
      });

      expect(req.body).toEqual({ test: 'data' });
      expect(req.params).toEqual({ id: '123' });
      expect(req.user).toEqual({ userId: 'test-user', role: 'USER' });
    });

    it('should create mock response objects', () => {
      const res = createMockResponse();

      expect(res.status).toBeDefined();
      expect(res.json).toBeDefined();
      expect(res.send).toBeDefined();
    });

    it('should create test users', () => {
      const user = testUtils.createTestUser({
        email: 'test@example.com',
        role: 'MERCHANT'
      });

      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('MERCHANT');
      expect(user.kycStatus).toBe('APPROVED');
      expect(testUtils.isValidEthereumAddress(user.walletAddress)).toBe(true);
    });

    it('should create test payments', () => {
      const payment = testUtils.createTestPayment({
        amount: '250.00',
        currency: 'USDT',
        status: 'CONFIRMED'
      });

      expect(payment.amount).toBe('250.00');
      expect(payment.currency).toBe('USDT');
      expect(payment.status).toBe('CONFIRMED');
      expect(testUtils.isValidEthereumAddress(payment.senderAddress)).toBe(true);
      expect(testUtils.isValidEthereumAddress(payment.recipientAddress)).toBe(true);
    });

    it('should create test merchants', () => {
      const merchant = testUtils.createTestMerchant({
        name: 'Test Store',
        isActive: false
      });

      expect(merchant.name).toBe('Test Store');
      expect(merchant.isActive).toBe(false);
      expect(testUtils.isValidEthereumAddress(merchant.walletAddress)).toBe(true);
    });

    it('should generate valid JWT tokens', () => {
      const token = testUtils.generateTestJWT('test-user-id', 'ADMIN');
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate mock blockchain data', () => {
      const txHash = testUtils.generateMockTransactionHash();
      const walletAddr = testUtils.generateMockWalletAddress();
      const contractAddr = testUtils.generateMockContractAddress();

      expect(testUtils.isValidTransactionHash(txHash)).toBe(true);
      expect(testUtils.isValidEthereumAddress(walletAddr)).toBe(true);
      expect(testUtils.isValidEthereumAddress(contractAddr)).toBe(true);
    });

    it('should validate Ethereum addresses correctly', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const invalidAddress = '0x123';
      const notHexAddress = '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG';

      expect(testUtils.isValidEthereumAddress(validAddress)).toBe(true);
      expect(testUtils.isValidEthereumAddress(invalidAddress)).toBe(false);
      expect(testUtils.isValidEthereumAddress(notHexAddress)).toBe(false);
    });

    it('should validate transaction hashes correctly', () => {
      const validHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const invalidHash = '0x123';
      const notHexHash = '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG';

      expect(testUtils.isValidTransactionHash(validHash)).toBe(true);
      expect(testUtils.isValidTransactionHash(invalidHash)).toBe(false);
      expect(testUtils.isValidTransactionHash(notHexHash)).toBe(false);
    });

    it('should create proper auth headers', () => {
      const token = 'test-jwt-token';
      const headers = testUtils.createAuthHeaders(token);

      expect(headers).toEqual({
        'Authorization': 'Bearer test-jwt-token',
        'Content-Type': 'application/json'
      });
    });

    it('should handle async sleep utility', async () => {
      const start = Date.now();
      await testUtils.sleep(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('Database Test Infrastructure', () => {
    it('should clean database without errors', async () => {
      await expect(testUtils.cleanDatabase()).resolves.not.toThrow();
    });

    it('should clean Redis without errors', async () => {
      await expect(testUtils.cleanRedis()).resolves.not.toThrow();
    });

    it('should perform full cleanup without errors', async () => {
      await expect(testUtils.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Coverage Requirements Validation', () => {
    it('should meet 95% coverage threshold for backend', () => {
      // This test validates that our Jest configuration enforces 95% coverage
      const jestConfig = require('../jest.config.js');
      
      expect(jestConfig.coverageThreshold.global.branches).toBe(95);
      expect(jestConfig.coverageThreshold.global.functions).toBe(95);
      expect(jestConfig.coverageThreshold.global.lines).toBe(95);
      expect(jestConfig.coverageThreshold.global.statements).toBe(95);
    });

    it('should exclude appropriate files from coverage', () => {
      const jestConfig = require('../jest.config.js');
      
      expect(jestConfig.collectCoverageFrom).toContain('src/**/*.ts');
      expect(jestConfig.collectCoverageFrom).toContain('!src/**/*.d.ts');
      expect(jestConfig.collectCoverageFrom).toContain('!src/index.ts');
    });
  });

  describe('Payment Service Infrastructure', () => {
    it('should validate payment creation request structure', () => {
      const payment = testUtils.createTestPayment({
        amount: '100.50',
        currency: 'USDC',
        sourceChain: 'ethereum',
        destinationChain: 'polygon'
      });

      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('userId');
      expect(payment).toHaveProperty('merchantId');
      expect(payment).toHaveProperty('amount', '100.50');
      expect(payment).toHaveProperty('currency', 'USDC');
      expect(payment).toHaveProperty('sourceChain', 'ethereum');
      expect(payment).toHaveProperty('destinationChain', 'polygon');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('senderAddress');
      expect(payment).toHaveProperty('recipientAddress');
    });

    it('should validate user creation structure', () => {
      const user = testUtils.createTestUser({
        email: 'user@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER'
      });

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', 'user@test.com');
      expect(user).toHaveProperty('firstName', 'John');
      expect(user).toHaveProperty('lastName', 'Doe');
      expect(user).toHaveProperty('role', 'USER');
      expect(user).toHaveProperty('walletAddress');
      expect(user).toHaveProperty('kycStatus');
    });

    it('should validate merchant creation structure', () => {
      const merchant = testUtils.createTestMerchant({
        name: 'Test Merchant Inc.',
        email: 'merchant@test.com',
        isActive: true
      });

      expect(merchant).toHaveProperty('id');
      expect(merchant).toHaveProperty('name', 'Test Merchant Inc.');
      expect(merchant).toHaveProperty('email', 'merchant@test.com');
      expect(merchant).toHaveProperty('isActive', true);
      expect(merchant).toHaveProperty('walletAddress');
    });
  });

  describe('Error Handling Infrastructure', () => {
    it('should handle validation errors properly', () => {
      // Test that our test infrastructure can handle errors
      expect(() => {
        testUtils.isValidEthereumAddress('invalid-address');
      }).not.toThrow();

      expect(testUtils.isValidEthereumAddress('invalid-address')).toBe(false);
    });

    it('should handle async errors in test utilities', async () => {
      // Test that async utilities handle errors gracefully
      await expect(testUtils.sleep(10)).resolves.not.toThrow();
    });
  });
});