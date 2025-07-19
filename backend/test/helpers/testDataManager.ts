import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Test Data Manager for E2E and Integration Tests
 * 
 * This utility helps with creating and cleaning up test data
 * in a consistent way across different test suites.
 */
export class TestDataManager {
  private prisma: PrismaClient;
  private redis: Redis;
  private testDataRegistry: Set<string> = new Set();

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Create a test user with the given role
   */
  async createTestUser(options: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: 'user' | 'merchant' | 'admin';
    walletAddress?: string;
  } = {}) {
    const {
      email = `test-user-${Date.now()}@example.com`,
      password = 'SecurePassword123!',
      firstName = 'Test',
      lastName = 'User',
      role = 'user',
      walletAddress = `0x${Math.random().toString(16).substring(2, 42)}`
    } = options;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        walletAddress
      }
    });

    // Register for cleanup
    this.testDataRegistry.add(`user:${user.id}`);

    return {
      ...user,
      rawPassword: password // Include raw password for test login
    };
  }

  /**
   * Create a test payment
   */
  async createTestPayment(options: {
    userId?: string;
    merchantId?: string;
    amount?: string;
    currency?: string;
    status?: string;
    yieldStrategy?: string;
    description?: string;
    sourceChain?: string;
    destinationChain?: string;
  } = {}) {
    // Create user and merchant if not provided
    let userId = options.userId;
    let merchantId = options.merchantId;

    if (!userId) {
      const user = await this.createTestUser({ role: 'user' });
      userId = user.id;
    }

    if (!merchantId) {
      const merchant = await this.createTestUser({ role: 'merchant' });
      merchantId = merchant.id;
    }

    const {
      amount = '100.00',
      currency = 'USDC',
      status = 'pending',
      yieldStrategy = 'noble-tbill',
      description = `Test Payment ${Date.now()}`,
      sourceChain = 'ethereum',
      destinationChain = options.destinationChain
    } = options;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        merchantId,
        amount,
        currency,
        status,
        yieldStrategy,
        description,
        sourceChain,
        destinationChain,
        tokenAddress: '0x1234567890123456789012345678901234567890',
        tokenSymbol: 'USDC',
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientAddress: '0x0987654321098765432109876543210987654321',
        estimatedYield: '0.01'
      }
    });

    // Register for cleanup
    this.testDataRegistry.add(`payment:${payment.id}`);

    return payment;
  }

  /**
   * Create a test yield earning
   */
  async createTestYieldEarning(options: {
    userId?: string;
    paymentId?: string;
    strategyId?: string;
    principalAmount?: string;
    yieldAmount?: string;
  } = {}) {
    // Create user and payment if not provided
    let userId = options.userId;
    let paymentId = options.paymentId;

    if (!userId) {
      const user = await this.createTestUser({ role: 'user' });
      userId = user.id;
    }

    if (!paymentId) {
      const payment = await this.createTestPayment({ userId });
      paymentId = payment.id;
    }

    const {
      strategyId = 'noble-tbill',
      principalAmount = '100.00',
      yieldAmount = '0.05'
    } = options;

    const yieldEarning = await this.prisma.yieldEarning.create({
      data: {
        userId,
        paymentId,
        strategyId,
        principalAmount,
        yieldAmount,
        netYieldAmount: yieldAmount,
        tokenAddress: '0x1234567890123456789012345678901234567890',
        status: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000) // 1 day later
      }
    });

    // Register for cleanup
    this.testDataRegistry.add(`yieldEarning:${yieldEarning.id}`);

    return yieldEarning;
  }

  /**
   * Create a test cross-chain transaction
   */
  async createTestCrossChainTransaction(options: {
    paymentId?: string;
    sourceChain?: string;
    destinationChain?: string;
    status?: string;
  } = {}) {
    // Create payment if not provided
    let paymentId = options.paymentId;

    if (!paymentId) {
      const payment = await this.createTestPayment({
        sourceChain: options.sourceChain || 'ethereum',
        destinationChain: options.destinationChain || 'polygon'
      });
      paymentId = payment.id;
    }

    const {
      sourceChain = 'ethereum',
      destinationChain = 'polygon',
      status = 'pending'
    } = options;

    const transaction = await this.prisma.crossChainTransaction.create({
      data: {
        paymentId,
        sourceChain,
        destinationChain,
        status,
        sourceTransactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        amount: '100.00',
        fee: '1.00',
        initiatedAt: new Date()
      }
    });

    // Register for cleanup
    this.testDataRegistry.add(`crossChainTransaction:${transaction.id}`);

    return transaction;
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(userId: string, role: string = 'user'): string {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  }

  /**
   * Clean up all test data created by this manager
   */
  async cleanup() {
    // Group by entity type
    const userIds: string[] = [];
    const paymentIds: string[] = [];
    const yieldEarningIds: string[] = [];
    const crossChainTransactionIds: string[] = [];

    this.testDataRegistry.forEach(item => {
      const [type, id] = item.split(':');
      switch (type) {
        case 'user':
          userIds.push(id);
          break;
        case 'payment':
          paymentIds.push(id);
          break;
        case 'yieldEarning':
          yieldEarningIds.push(id);
          break;
        case 'crossChainTransaction':
          crossChainTransactionIds.push(id);
          break;
      }
    });

    // Delete in correct order to avoid foreign key constraints
    if (yieldEarningIds.length > 0) {
      await this.prisma.yieldEarning.deleteMany({
        where: { id: { in: yieldEarningIds } }
      });
    }

    if (crossChainTransactionIds.length > 0) {
      await this.prisma.crossChainTransaction.deleteMany({
        where: { id: { in: crossChainTransactionIds } }
      });
    }

    if (paymentIds.length > 0) {
      await this.prisma.payment.deleteMany({
        where: { id: { in: paymentIds } }
      });
    }

    if (userIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    }

    // Clear Redis cache
    await this.redis.flushdb();

    // Clear registry
    this.testDataRegistry.clear();
  }
}