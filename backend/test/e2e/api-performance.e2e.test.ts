import { jest } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ApiTestUtils } from '../helpers/testUtils';
import { createApp } from '../../src/index';

describe('API Performance Tests', () => {
  let app: Express.Application;
  let server: Server;
  let prisma: PrismaClient;
  let redis: Redis;
  let authToken: string;

  // Performance thresholds
  const RESPONSE_TIME_THRESHOLD = 200; // 200ms
  const BATCH_SIZE = 10;
  const CONCURRENT_REQUESTS = 5;

  beforeAll(async () => {
    // Initialize the application
    app = await createApp();
    server = app.listen(3001);
    
    // Initialize database and Redis clients
    prisma = new PrismaClient();
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/3');
    
    // Set up test data and get auth token
    await setupTestData();
    authToken = await generateAuthToken();
  });

  afterAll(async () => {
    // Clean up resources
    await cleanupTestData();
    await prisma.$disconnect();
    await redis.quit();
    server.close();
  });

  it('should handle payment creation with acceptable response time', async () => {
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: '100.00',
        currency: 'USDC',
        merchantId: '1',
        description: 'Performance Test Payment',
        yieldStrategy: 'noble-tbill'
      });

    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(201);
    expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
  });

  it('should handle batch payment retrieval efficiently', async () => {
    // Create multiple test payments first
    const paymentIds = await createBatchPayments(BATCH_SIZE);
    
    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: BATCH_SIZE });

    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body.payments.length).toBeGreaterThanOrEqual(BATCH_SIZE);
    expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
  });

  it('should handle yield calculation efficiently', async () => {
    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/yield/strategies')
      .set('Authorization', `Bearer ${authToken}`);

    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
  });

  it('should handle concurrent payment creation requests', async () => {
    const requests = Array(CONCURRENT_REQUESTS).fill(0).map(() => 
      request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: '100.00',
          currency: 'USDC',
          merchantId: '1',
          description: 'Concurrent Performance Test Payment',
          yieldStrategy: 'noble-tbill'
        })
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    // Check all responses were successful
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });
    
    // Average time should be below threshold
    const averageTime = totalTime / CONCURRENT_REQUESTS;
    expect(averageTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
  });

  it('should handle cross-chain bridge operations efficiently', async () => {
    // Create a payment for bridging
    const paymentResponse = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: '100.00',
        currency: 'USDC',
        merchantId: '1',
        description: 'Bridge Performance Test Payment',
        yieldStrategy: 'noble-tbill',
        sourceChain: 'ethereum',
        destinationChain: 'polygon'
      });
    
    const paymentId = paymentResponse.body.id;
    
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/api/crosschain/bridge')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentId,
        destinationAddress: '0x0987654321098765432109876543210987654321'
      });

    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD * 1.5); // Allow slightly longer for bridge operations
  });

  // Helper functions
  async function setupTestData() {
    // Create test user
    await prisma.user.create({
      data: {
        id: 'perf-test-user',
        email: 'performance-test@example.com',
        password: '$2a$10$XgXB0J0Qs1UvYMpM4iQQY.Vb.3.T3/MpI1h7XtD5wXnHVQY6Fv6Hy', // hashed 'SecurePassword123!'
        firstName: 'Performance',
        lastName: 'Test',
        role: 'user',
        walletAddress: '0x1234567890123456789012345678901234567890'
      }
    });
    
    // Create test merchant
    await prisma.user.create({
      data: {
        id: '1',
        email: 'performance-merchant@example.com',
        password: '$2a$10$XgXB0J0Qs1UvYMpM4iQQY.Vb.3.T3/MpI1h7XtD5wXnHVQY6Fv6Hy', // hashed 'SecurePassword123!'
        firstName: 'Performance',
        lastName: 'Merchant',
        role: 'merchant',
        walletAddress: '0x0987654321098765432109876543210987654321'
      }
    });
    
    // Create yield strategy
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

  async function cleanupTestData() {
    // Delete test payments
    await prisma.payment.deleteMany({
      where: {
        description: {
          contains: 'Performance Test'
        }
      }
    });
    
    // Delete test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'performance-'
        }
      }
    });
    
    // Clear Redis cache
    await redis.flushdb();
  }

  async function generateAuthToken() {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'performance-test@example.com',
        password: 'SecurePassword123!'
      });
    
    return loginResponse.body.token;
  }

  async function createBatchPayments(count) {
    const paymentIds = [];
    
    for (let i = 0; i < count; i++) {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: '100.00',
          currency: 'USDC',
          merchantId: '1',
          description: `Batch Performance Test Payment ${i}`,
          yieldStrategy: 'noble-tbill'
        });
      
      paymentIds.push(response.body.id);
    }
    
    return paymentIds;
  }
});