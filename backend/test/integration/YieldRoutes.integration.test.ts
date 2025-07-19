import request from 'supertest';
import { PrismaClient, YieldStrategyType, RiskLevel } from '@prisma/client';
import { database } from '../../src/config/database';
import { YieldRailsServer } from '../../src/index';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/environment';

describe('Yield Routes Integration Tests', () => {
    let app: any;
    let server: any;
    let prisma: PrismaClient;
    let userToken: string;
    let adminToken: string;

    beforeAll(async () => {
        // Initialize server
        const yieldRailsServer = new YieldRailsServer();
        await yieldRailsServer.start();
        app = yieldRailsServer['app'];
        server = yieldRailsServer['server'];
        prisma = database.getClient();

        // Create test tokens
        userToken = jwt.sign(
            { 
                sub: 'user123', 
                address: '0xuser', 
                role: 'user',
                isVerified: true 
            },
            config.JWT_SECRET,
            { 
                expiresIn: '1h',
                issuer: 'yieldrails-api',
                audience: 'yieldrails-client'
            }
        );

        adminToken = jwt.sign(
            { 
                sub: 'admin123', 
                address: '0xadmin', 
                role: 'admin',
                isVerified: true 
            },
            config.JWT_SECRET,
            { 
                expiresIn: '1h',
                issuer: 'yieldrails-api',
                audience: 'yieldrails-client'
            }
        );

        // Create test data
        await setupTestData();
    });

    afterAll(async () => {
        // Clean up test data
        await cleanupTestData();

        // Close server
        await new Promise<void>((resolve) => {
            server.close(() => {
                resolve();
            });
        });
    });

    async function setupTestData() {
        // Create test strategies
        await prisma.yieldStrategy.createMany({
            data: [
                {
                    id: 'test-strategy-1',
                    name: 'Test Strategy 1',
                    description: 'Low risk strategy for testing',
                    protocolName: 'Test Protocol',
                    chainId: 'ethereum',
                    contractAddress: '0xtest1',
                    strategyType: YieldStrategyType.LENDING,
                    expectedAPY: 4.5,
                    riskLevel: RiskLevel.LOW,
                    minAmount: 100,
                    maxAmount: 10000,
                    isActive: true
                },
                {
                    id: 'test-strategy-2',
                    name: 'Test Strategy 2',
                    description: 'Medium risk strategy for testing',
                    protocolName: 'Test Protocol',
                    chainId: 'polygon',
                    contractAddress: '0xtest2',
                    strategyType: YieldStrategyType.STAKING,
                    expectedAPY: 8.0,
                    riskLevel: RiskLevel.MEDIUM,
                    minAmount: 50,
                    isActive: true
                }
            ]
        });

        // Create test user
        await prisma.user.create({
            data: {
                id: 'user123',
                email: 'test@example.com',
                walletAddress: '0xuser',
                isActive: true
            }
        });

        // Create test payment
        await prisma.payment.create({
            data: {
                id: 'test-payment-1',
                userId: 'user123',
                amount: 1000,
                currency: 'USD',
                tokenSymbol: 'USDC',
                status: 'CONFIRMED',
                sourceChain: 'ethereum',
                senderAddress: '0xuser',
                recipientAddress: '0xrecipient',
                estimatedYield: 50,
                actualYield: 45,
                yieldStrategy: 'Test Strategy 1',
                yieldDuration: 86400 // 1 day
            }
        });

        // Create test yield earning
        await prisma.yieldEarning.create({
            data: {
                userId: 'user123',
                paymentId: 'test-payment-1',
                strategyId: 'test-strategy-1',
                principalAmount: 1000,
                yieldAmount: 45,
                feeAmount: 4.5,
                netYieldAmount: 31.5, // 70% of yield
                tokenAddress: '0xtoken',
                tokenSymbol: 'USDC',
                chainId: 'ethereum',
                startTime: new Date(Date.now() - 86400000), // 1 day ago
                status: 'ACTIVE'
            }
        });
    }

    async function cleanupTestData() {
        await prisma.yieldEarning.deleteMany({
            where: {
                userId: 'user123'
            }
        });
        
        await prisma.payment.deleteMany({
            where: {
                userId: 'user123'
            }
        });
        
        await prisma.user.deleteMany({
            where: {
                id: 'user123'
            }
        });
        
        await prisma.yieldStrategy.deleteMany({
            where: {
                id: {
                    in: ['test-strategy-1', 'test-strategy-2']
                }
            }
        });
    }

    describe('GET /api/yield/strategies', () => {
        it('should return list of available strategies', async () => {
            const response = await request(app)
                .get('/api/yield/strategies');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('strategies');
            expect(response.body.data.strategies).toHaveLength(2);
            expect(response.body.data.strategies[0]).toHaveProperty('name');
            expect(response.body.data.strategies[0]).toHaveProperty('expectedAPY');
        });
    });

    describe('GET /api/yield/strategies/:strategyId/apy', () => {
        it('should return current APY for a strategy', async () => {
            const response = await request(app)
                .get('/api/yield/strategies/test-strategy-1/apy');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('strategyId', 'test-strategy-1');
            expect(response.body.data).toHaveProperty('currentAPY');
        });

        it('should return 400 for invalid strategy ID', async () => {
            const response = await request(app)
                .get('/api/yield/strategies//apy');

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/yield/payment/:paymentId/current', () => {
        it('should return current yield for a payment', async () => {
            const response = await request(app)
                .get('/api/yield/payment/test-payment-1/current')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('paymentId', 'test-payment-1');
            expect(response.body.data).toHaveProperty('currentYield');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/yield/payment/test-payment-1/current');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/yield/optimize', () => {
        it('should return yield optimization recommendations', async () => {
            const response = await request(app)
                .post('/api/yield/optimize')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    amount: 1000,
                    riskTolerance: 'medium'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('amount', 1000);
            expect(response.body.data).toHaveProperty('optimization');
            expect(response.body.data.optimization).toHaveProperty('strategies');
        });

        it('should validate input parameters', async () => {
            const response = await request(app)
                .post('/api/yield/optimize')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    amount: -100, // Invalid amount
                    riskTolerance: 'invalid' // Invalid risk tolerance
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Validation Error');
        });
    });

    describe('GET /api/yield/user/:userId/history', () => {
        it('should return yield history for a user', async () => {
            const response = await request(app)
                .get('/api/yield/user/user123/history')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('userId', 'user123');
            expect(response.body.data).toHaveProperty('history');
        });

        it('should enforce authorization (users can only see their own history)', async () => {
            // Create a different user token
            const otherUserToken = jwt.sign(
                { 
                    sub: 'other123', 
                    address: '0xother', 
                    role: 'user',
                    isVerified: true 
                },
                config.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/yield/user/user123/history')
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(403);
        });

        it('should allow admins to see any user history', async () => {
            const response = await request(app)
                .get('/api/yield/user/user123/history')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/yield/user/:userId/performance', () => {
        it('should return yield performance metrics for a user', async () => {
            const response = await request(app)
                .get('/api/yield/user/user123/performance')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('userId', 'user123');
            expect(response.body.data).toHaveProperty('performance');
        });
    });

    describe('GET /api/yield/analytics', () => {
        it('should require admin role', async () => {
            const response = await request(app)
                .get('/api/yield/analytics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });

        it('should return overall yield analytics for admins', async () => {
            const response = await request(app)
                .get('/api/yield/analytics')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('platformMetrics');
            expect(response.body.data).toHaveProperty('topPerformingStrategies');
        });
    });

    describe('GET /api/yield/strategies/comparison', () => {
        it('should return strategy performance comparison', async () => {
            const response = await request(app)
                .get('/api/yield/strategies/comparison')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('strategies');
        });
    });

    describe('POST /api/yield/strategies', () => {
        it('should require admin role', async () => {
            const response = await request(app)
                .post('/api/yield/strategies')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'New Strategy',
                    protocolName: 'New Protocol',
                    chainId: 'ethereum',
                    contractAddress: '0xnew',
                    strategyType: 'LENDING',
                    expectedAPY: 5.0,
                    riskLevel: 'LOW',
                    minAmount: 100
                });

            expect(response.status).toBe(403);
        });

        it('should create a new yield strategy for admins', async () => {
            const response = await request(app)
                .post('/api/yield/strategies')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'New Test Strategy',
                    description: 'New strategy for testing',
                    protocolName: 'New Protocol',
                    chainId: 'ethereum',
                    contractAddress: '0xnew',
                    strategyType: 'LENDING',
                    expectedAPY: 5.0,
                    riskLevel: 'LOW',
                    minAmount: 100
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('name', 'New Test Strategy');

            // Clean up the created strategy
            await prisma.yieldStrategy.delete({
                where: { name: 'New Test Strategy' }
            });
        });

        it('should validate input parameters', async () => {
            const response = await request(app)
                .post('/api/yield/strategies')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Invalid Strategy',
                    // Missing required fields
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Validation Error');
        });
    });

    describe('GET /api/yield/payment/:paymentId/distribution', () => {
        it('should return yield distribution details for a payment', async () => {
            const response = await request(app)
                .get('/api/yield/payment/test-payment-1/distribution')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('paymentId', 'test-payment-1');
            expect(response.body.data).toHaveProperty('totalYield');
            expect(response.body.data).toHaveProperty('distribution');
            expect(response.body.data.distribution).toHaveProperty('user');
            expect(response.body.data.distribution).toHaveProperty('protocol');
        });
    });
});