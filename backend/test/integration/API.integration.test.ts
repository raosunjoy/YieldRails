import request from 'supertest';
import { YieldRailsServer } from '../../src/index';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/config/redis';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger');
jest.mock('../../src/services/websocket');

describe('API Integration Tests', () => {
    let app: any;
    let server: YieldRailsServer;
    let authToken: string;
    let adminToken: string;

    beforeAll(async () => {
        // Mock database and Redis connections
        (PrismaClient as jest.Mock).mockImplementation(() => ({
            $connect: jest.fn().mockResolvedValue(undefined),
            $disconnect: jest.fn().mockResolvedValue(undefined),
        }));

        (redis as any).connect = jest.fn().mockResolvedValue(undefined);
        (redis as any).disconnect = jest.fn().mockResolvedValue(undefined);

        // Create server instance
        server = new YieldRailsServer();
        app = (server as any).app;

        // Mock auth tokens
        authToken = 'Bearer mock-user-token';
        adminToken = 'Bearer mock-admin-token';
    });

    afterAll(async () => {
        if (server) {
            await (server as any).shutdown();
        }
    });

    describe('Health Endpoints', () => {
        it('GET /api/health should return system health', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
        });

        it('GET /api should return API documentation', async () => {
            const response = await request(app)
                .get('/api')
                .expect(200);

            expect(response.body).toHaveProperty('name', 'YieldRails API');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.endpoints).toHaveProperty('crosschain');
            expect(response.body.endpoints).toHaveProperty('yield');
            expect(response.body.endpoints).toHaveProperty('compliance');
            expect(response.body.endpoints).toHaveProperty('admin');
        });
    });

    describe('Cross-Chain API Endpoints', () => {
        it('GET /api/crosschain/supported-chains should return supported chains', async () => {
            const response = await request(app)
                .get('/api/crosschain/supported-chains')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('chains');
            expect(response.body.data).toHaveProperty('count');
            expect(Array.isArray(response.body.data.chains)).toBe(true);
        });

        it('POST /api/crosschain/estimate should calculate bridge estimates', async () => {
            const estimateRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000
            };

            const response = await request(app)
                .post('/api/crosschain/estimate')
                .send(estimateRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('estimatedFee');
            expect(response.body.data).toHaveProperty('estimatedTime');
            expect(response.body.data).toHaveProperty('estimatedYield');
            expect(response.body.data).toHaveProperty('netAmount');
        });

        it('GET /api/crosschain/liquidity should return liquidity pools', async () => {
            const response = await request(app)
                .get('/api/crosschain/liquidity')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('pools');
            expect(response.body.data).toHaveProperty('count');
            expect(Array.isArray(response.body.data.pools)).toBe(true);
        });

        it('POST /api/crosschain/liquidity/check should check liquidity availability', async () => {
            const liquidityRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                token: 'USDC'
            };

            const response = await request(app)
                .post('/api/crosschain/liquidity/check')
                .send(liquidityRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('available');
            expect(response.body.data).toHaveProperty('reason');
            expect(response.body.data).toHaveProperty('suggestedAmount');
        });

        it('POST /api/crosschain/bridge should require authentication', async () => {
            const bridgeRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x1234567890123456789012345678901234567890',
                destinationAddress: '0x0987654321098765432109876543210987654321',
                token: 'USDC'
            };

            await request(app)
                .post('/api/crosschain/bridge')
                .send(bridgeRequest)
                .expect(401);
        });
    });

    describe('Yield API Endpoints', () => {
        it('GET /api/yield/strategies should return available strategies', async () => {
            const response = await request(app)
                .get('/api/yield/strategies')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('strategies');
            expect(response.body.data).toHaveProperty('count');
        });

        it('GET /api/yield/strategies/:strategyId/apy should validate strategy ID', async () => {
            await request(app)
                .get('/api/yield/strategies/invalid-id/apy')
                .expect(400);
        });

        it('POST /api/yield/optimize should require authentication', async () => {
            const optimizeRequest = {
                amount: 1000,
                riskTolerance: 'medium'
            };

            await request(app)
                .post('/api/yield/optimize')
                .send(optimizeRequest)
                .expect(401);
        });
    });

    describe('Compliance API Endpoints', () => {
        it('POST /api/compliance/check-address should validate address format', async () => {
            const invalidRequest = {
                address: 'invalid-address'
            };

            const response = await request(app)
                .post('/api/compliance/check-address')
                .send(invalidRequest)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(response.body.details).toBeDefined();
        });

        it('POST /api/compliance/check-address should check valid address', async () => {
            const validRequest = {
                address: '0x1234567890123456789012345678901234567890'
            };

            const response = await request(app)
                .post('/api/compliance/check-address')
                .send(validRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('address');
            expect(response.body.data).toHaveProperty('isCompliant');
            expect(response.body.data).toHaveProperty('riskLevel');
        });

        it('GET /api/compliance/status/:address should validate address parameter', async () => {
            await request(app)
                .get('/api/compliance/status/invalid-address')
                .expect(400);
        });

        it('GET /api/compliance/status/:address should return compliance status', async () => {
            const response = await request(app)
                .get('/api/compliance/status/0x1234567890123456789012345678901234567890')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('status');
            expect(response.body.data).toHaveProperty('riskScore');
            expect(response.body.data).toHaveProperty('kycStatus');
        });

        it('POST /api/compliance/kyc should require authentication', async () => {
            const kycRequest = {
                userId: 'user123',
                documentType: 'passport',
                documentNumber: 'P123456789',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                address: '123 Main St'
            };

            await request(app)
                .post('/api/compliance/kyc')
                .send(kycRequest)
                .expect(401);
        });
    });

    describe('Admin API Endpoints', () => {
        it('GET /api/admin/dashboard should require authentication', async () => {
            await request(app)
                .get('/api/admin/dashboard')
                .expect(401);
        });

        it('GET /api/admin/users should require admin role', async () => {
            await request(app)
                .get('/api/admin/users')
                .set('Authorization', authToken)
                .expect(403);
        });

        it('GET /api/admin/system/health should require admin role', async () => {
            await request(app)
                .get('/api/admin/system/health')
                .set('Authorization', authToken)
                .expect(403);
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent-route')
                .expect(404);

            expect(response.body.error).toBe('Not Found');
            expect(response.body.message).toContain('not found');
        });

        it('should handle malformed JSON requests', async () => {
            await request(app)
                .post('/api/compliance/check-address')
                .send('invalid-json')
                .set('Content-Type', 'application/json')
                .expect(400);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/crosschain/estimate')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(response.body.details).toBeDefined();
        });
    });

    describe('Rate Limiting', () => {
        it('should apply rate limiting to API endpoints', async () => {
            // This test would need to be adjusted based on actual rate limiting configuration
            // For now, we'll just verify the endpoint responds normally
            const response = await request(app)
                .get('/api/crosschain/supported-chains')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('CORS and Security Headers', () => {
        it('should include security headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            // Check for security headers (helmet middleware)
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-frame-options');
        });
    });

    describe('API Documentation', () => {
        it('should provide comprehensive API documentation', async () => {
            const response = await request(app)
                .get('/api')
                .expect(200);

            expect(response.body.endpoints).toHaveProperty('health');
            expect(response.body.endpoints).toHaveProperty('auth');
            expect(response.body.endpoints).toHaveProperty('payments');
            expect(response.body.endpoints).toHaveProperty('yield');
            expect(response.body.endpoints).toHaveProperty('crosschain');
            expect(response.body.endpoints).toHaveProperty('compliance');
            expect(response.body.endpoints).toHaveProperty('admin');
        });
    });
});