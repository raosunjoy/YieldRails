import { jest } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ApiTestUtils, TimeTestUtils } from '../helpers/testUtils';
import { createApp } from '../../src/index';

describe('Payment Workflow E2E Tests', () => {
  let app: Express.Application;
  let server: Server;
  let prisma: PrismaClient;
  let redis: Redis;
  let authToken: string;
  let merchantToken: string;
  let paymentId: string;

  beforeAll(async () => {
    // Initialize the application
    app = await createApp();
    server = app.listen(3001);
    
    // Initialize database and Redis clients
    prisma = new PrismaClient();
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/3');
    
    // Clean up any existing test data
    await cleanDatabase();
    
    // Set up test data
    await setupTestData();
    
    // Generate auth tokens
    authToken = await generateUserToken();
    merchantToken = await generateMerchantToken();
  });

  afterAll(async () => {
    // Clean up resources
    await cleanDatabase();
    await prisma.$disconnect();
    await redis.quit();
    server.close();
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'e2e-test-user@example.com',
        password: 'SecurePassword123!',
        firstName: 'E2E',
        lastName: 'Test',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('e2e-test-user@example.com');
  });

  it('should login with registered user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e-test-user@example.com',
        password: 'SecurePassword123!'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    
    // Save token for subsequent requests
    authToken = response.body.token;
  });

  it('should create a new payment', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: '100.00',
        currency: 'USDC',
        merchantId: '1',
        description: 'E2E Test Payment',
        yieldStrategy: 'noble-tbill'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', 'pending');
    expect(response.body).toHaveProperty('amount', '100.00');
    
    // Save payment ID for subsequent tests
    paymentId = response.body.id;
  });

  it('should get payment details', async () => {
    const response = await request(app)
      .get(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', paymentId);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('estimatedYield');
  });

  it('should confirm payment with blockchain transaction', async () => {
    const response = await request(app)
      .post(`/api/payments/${paymentId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'confirmed');
  });

  it('should generate yield for the payment', async () => {
    // Mock time advancement to simulate yield generation
    TimeTestUtils.mockCurrentTime(Date.now() + 86400000); // Advance 1 day
    
    const response = await request(app)
      .get(`/api/yield/earnings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('earnings');
    expect(response.body.earnings.length).toBeGreaterThan(0);
    expect(response.body.earnings[0]).toHaveProperty('paymentId', paymentId);
    expect(parseFloat(response.body.earnings[0].yieldAmount)).toBeGreaterThan(0);
    
    // Restore time
    TimeTestUtils.restoreTime();
  });

  it('should allow merchant to release payment', async () => {
    const response = await request(app)
      .post(`/api/payments/${paymentId}/release`)
      .set('Authorization', `Bearer ${merchantToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'released');
  });

  it('should distribute yield correctly after release', async () => {
    // Check user yield earnings
    const userYieldResponse = await request(app)
      .get(`/api/yield/earnings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(userYieldResponse.status).toBe(200);
    expect(userYieldResponse.body.earnings.some(e => e.paymentId === paymentId)).toBe(true);
    
    // Check merchant yield earnings
    const merchantYieldResponse = await request(app)
      .get(`/api/yield/earnings`)
      .set('Authorization', `Bearer ${merchantToken}`);

    expect(merchantYieldResponse.status).toBe(200);
    expect(merchantYieldResponse.body.earnings.some(e => e.paymentId === paymentId)).toBe(true);
  });

  it('should handle cross-chain payment workflow', async () => {
    // Create cross-chain payment
    const createResponse = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: '200.00',
        currency: 'USDC',
        merchantId: '1',
        description: 'E2E Test Cross-Chain Payment',
        yieldStrategy: 'noble-tbill',
        sourceChain: 'ethereum',
        destinationChain: 'polygon'
      });

    expect(createResponse.status).toBe(201);
    const crossChainPaymentId = createResponse.body.id;

    // Initiate bridge transaction
    const bridgeResponse = await request(app)
      .post(`/api/crosschain/bridge`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentId: crossChainPaymentId,
        destinationAddress: '0x0987654321098765432109876543210987654321'
      });

    expect(bridgeResponse.status).toBe(200);
    expect(bridgeResponse.body).toHaveProperty('transactionId');
    const bridgeTransactionId = bridgeResponse.body.transactionId;

    // Check bridge status
    const statusResponse = await request(app)
      .get(`/api/crosschain/${bridgeTransactionId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toHaveProperty('status');
  });

  // Helper functions
  async function cleanDatabase() {
    // Delete test data from database
    await prisma.payment.deleteMany({
      where: {
        description: {
          contains: 'E2E Test'
        }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'e2e-test'
        }
      }
    });
    
    // Clear Redis cache
    await redis.flushdb();
  }

  async function setupTestData() {
    // Create test merchant
    await prisma.user.create({
      data: {
        id: '1',
        email: 'e2e-test-merchant@example.com',
        password: '$2a$10$XgXB0J0Qs1UvYMpM4iQQY.Vb.3.T3/MpI1h7XtD5wXnHVQY6Fv6Hy', // hashed 'SecurePassword123!'
        firstName: 'Test',
        lastName: 'Merchant',
        role: 'merchant',
        walletAddress: '0x0987654321098765432109876543210987654321'
      }
    });
    
    // Create yield strategies
    await prisma.yieldStrategy.create({
      data: {
        id: 'noble-tbill',
        name: 'Noble T-Bill Strategy',
        protocolName: 'Noble',
        chainId: '1',
        contractAddress: '0x1234567890123456789012345678901234567890',
        strategyType: 'TREASURY_BILLS',
        expectedAPY: '4.5',
        riskLevel: 'LOW',
        totalValueLocked: '1000000',
        isActive: true
      }
    });
  }

  async function generateUserToken() {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e-test-user@example.com',
        password: 'SecurePassword123!'
      });
    
    return loginResponse.body.token;
  }

  async function generateMerchantToken() {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e-test-merchant@example.com',
        password: 'SecurePassword123!'
      });
    
    return loginResponse.body.token;
  }
});