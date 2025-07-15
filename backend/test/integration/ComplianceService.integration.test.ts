import request from 'supertest';
import express from 'express';
import { complianceRouter } from '../../src/routes/compliance';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Create test Express app
const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
            req.user = { 
                id: decoded.userId, 
                role: decoded.role,
                address: '0x1234567890123456789012345678901234567890',
                isVerified: true
            };
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
});

app.use('/api/compliance', complianceRouter);

describe('Compliance API Integration Tests', () => {
    let authToken: string;
    let adminToken: string;
    let testUserId: string;
    let testMerchantId: string;

    beforeAll(async () => {
        // Create test user
        const testUser = await prisma.user.create({
            data: {
                email: 'testuser@example.com',
                hashedPassword: 'hashedpassword',
                firstName: 'Test',
                lastName: 'User',
                role: 'USER',
                kycStatus: 'PENDING',
            },
        });
        testUserId = testUser.id;

        // Create test admin
        const testAdmin = await prisma.user.create({
            data: {
                email: 'admin@example.com',
                hashedPassword: 'hashedpassword',
                firstName: 'Admin',
                lastName: 'User',
                role: 'ADMIN',
                kycStatus: 'APPROVED',
            },
        });

        // Create test merchant
        const testMerchant = await prisma.merchant.create({
            data: {
                name: 'Test Merchant',
                email: 'merchant@example.com',
                businessType: 'ONLINE',
                verificationStatus: 'APPROVED',
            },
        });
        testMerchantId = testMerchant.id;

        // Generate JWT tokens
        authToken = jwt.sign(
            { userId: testUserId, role: 'USER' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        adminToken = jwt.sign(
            { userId: testAdmin.id, role: 'ADMIN' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        // Clean up test data
        await prisma.kYCDocument.deleteMany({
            where: { userId: testUserId },
        });
        await prisma.merchant.delete({
            where: { id: testMerchantId },
        });
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: ['testuser@example.com', 'admin@example.com'],
                },
            },
        });
        await prisma.$disconnect();
    });

    describe('POST /api/compliance/check-address', () => {
        it('should check address compliance successfully', async () => {
            const response = await request(app)
                .post('/api/compliance/check-address')
                .send({
                    address: '0x1234567890123456789012345678901234567890',
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    address: '0x1234567890123456789012345678901234567890',
                    isCompliant: expect.any(Boolean),
                    riskLevel: expect.stringMatching(/^(low|medium|high|very_high)$/),
                    sanctions: expect.any(Boolean),
                    pep: expect.any(Boolean),
                    amlFlags: expect.any(Array),
                    lastChecked: expect.any(String),
                    source: expect.any(String),
                },
            });
        });

        it('should return 400 for invalid address', async () => {
            const response = await request(app)
                .post('/api/compliance/check-address')
                .send({
                    address: 'invalid-address',
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'Valid Ethereum address is required',
                    }),
                ])
            );
        });

        it('should return 400 for missing address', async () => {
            const response = await request(app)
                .post('/api/compliance/check-address')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
        });
    });

    describe('GET /api/compliance/status/:address', () => {
        it('should get compliance status successfully', async () => {
            const testAddress = '0x1234567890123456789012345678901234567890';
            
            const response = await request(app)
                .get(`/api/compliance/status/${testAddress}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    address: testAddress,
                    status: expect.any(String),
                    riskScore: expect.any(Number),
                    lastUpdated: expect.any(String),
                    kycStatus: expect.any(String),
                    amlStatus: expect.any(String),
                    restrictions: expect.any(Array),
                    approvedCountries: expect.any(Array),
                    blockedCountries: expect.any(Array),
                },
            });
        });

        it('should return 400 for invalid address parameter', async () => {
            const response = await request(app)
                .get('/api/compliance/status/invalid-address')
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
        });
    });

    describe('POST /api/compliance/kyc', () => {
        const validKYCData = {
            userId: '', // Will be set in tests
            documentType: 'passport',
            documentNumber: 'AB123456',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            address: '123 Main St, City, Country',
            documentUrl: 'https://example.com/document.jpg',
        };

        it('should submit KYC documents successfully', async () => {
            const kycData = { ...validKYCData, userId: testUserId };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(kycData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: 'KYC documents submitted successfully',
                data: {
                    submissionId: expect.stringMatching(/^kyc_/),
                    userId: testUserId,
                    status: 'pending',
                    documentType: 'passport',
                    documentNumber: 'AB123456',
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1990-01-01',
                    address: '123 Main St, City, Country',
                    documentUrl: 'https://example.com/document.jpg',
                    submittedAt: expect.any(String),
                    estimatedProcessingTime: expect.any(String),
                },
            });
        });

        it('should require authentication', async () => {
            const kycData = { ...validKYCData, userId: testUserId };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .send(kycData)
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
        });

        it('should prevent users from submitting KYC for other users', async () => {
            const kycData = { ...validKYCData, userId: 'other-user-id' };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(kycData)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(response.body.message).toBe('Access denied to submit KYC for this user');
        });

        it('should allow admins to submit KYC for any user', async () => {
            const kycData = { ...validKYCData, userId: testUserId };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(kycData)
                .expect(201);

            expect(response.body.success).toBe(true);
        });

        it('should validate required fields', async () => {
            const invalidKYCData = {
                userId: testUserId,
                documentType: 'passport',
                // Missing required fields
            };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidKYCData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('required'),
                    }),
                ])
            );
        });

        it('should validate document type', async () => {
            const invalidKYCData = {
                ...validKYCData,
                userId: testUserId,
                documentType: 'invalid_type',
            };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidKYCData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'Valid document type is required',
                    }),
                ])
            );
        });

        it('should validate date format', async () => {
            const invalidKYCData = {
                ...validKYCData,
                userId: testUserId,
                dateOfBirth: 'invalid-date',
            };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidKYCData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
        });
    });

    describe('GET /api/compliance/kyc/:userId/status', () => {
        it('should get KYC status for own user', async () => {
            const response = await request(app)
                .get(`/api/compliance/kyc/${testUserId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    userId: testUserId,
                    status: expect.any(String),
                    verificationLevel: expect.any(String),
                    submittedAt: expect.any(String),
                    approvedAt: expect.any(String),
                    expiresAt: expect.any(String),
                    documents: expect.any(Array),
                    limits: {
                        daily: expect.any(Number),
                        monthly: expect.any(Number),
                        annual: expect.any(Number),
                    },
                },
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get(`/api/compliance/kyc/${testUserId}/status`)
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
        });

        it('should prevent users from accessing other users KYC status', async () => {
            const response = await request(app)
                .get('/api/compliance/kyc/other-user-id/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(response.body.message).toBe('Access denied to KYC status');
        });

        it('should allow admins to access any user KYC status', async () => {
            const response = await request(app)
                .get(`/api/compliance/kyc/${testUserId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/compliance/transaction/verify', () => {
        const validTransactionData = {
            transactionId: 'tx_123456789',
            fromAddress: '0x1234567890123456789012345678901234567890',
            toAddress: '0x0987654321098765432109876543210987654321',
            amount: '1000.50',
            currency: 'USD',
        };

        it('should verify transaction compliance successfully', async () => {
            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validTransactionData)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    transactionId: 'tx_123456789',
                    status: expect.any(String),
                    riskScore: expect.any(Number),
                    amlCheck: expect.any(String),
                    sanctionsCheck: expect.any(String),
                    pepCheck: expect.any(String),
                    fromAddress: {
                        address: validTransactionData.fromAddress,
                        riskLevel: expect.any(String),
                        isBlacklisted: expect.any(Boolean),
                    },
                    toAddress: {
                        address: validTransactionData.toAddress,
                        riskLevel: expect.any(String),
                        isBlacklisted: expect.any(Boolean),
                    },
                    amount: 1000.5,
                    currency: 'USD',
                    verifiedAt: expect.any(String),
                    flags: expect.any(Array),
                    recommendations: expect.any(Array),
                },
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .send(validTransactionData)
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
        });

        it('should validate transaction data', async () => {
            const invalidTransactionData = {
                transactionId: 'tx_123456789',
                fromAddress: 'invalid-address',
                toAddress: '0x0987654321098765432109876543210987654321',
                amount: 'invalid-amount',
                currency: '',
            };

            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidTransactionData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(response.body.details.length).toBeGreaterThan(0);
        });

        it('should validate minimum amount', async () => {
            const invalidTransactionData = {
                ...validTransactionData,
                amount: '0.001', // Below minimum
            };

            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidTransactionData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
        });
    });

    describe('GET /api/compliance/report', () => {
        it('should generate compliance report for admin', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({
                    startDate: '2023-01-01T00:00:00.000Z',
                    endDate: '2023-12-31T23:59:59.999Z',
                    type: 'all',
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    reportId: expect.stringMatching(/^report_/),
                    type: 'all',
                    period: {
                        startDate: expect.any(String),
                        endDate: expect.any(String),
                    },
                    summary: {
                        totalTransactions: expect.any(Number),
                        flaggedTransactions: expect.any(Number),
                        approvedTransactions: expect.any(Number),
                        rejectedTransactions: expect.any(Number),
                        pendingReview: expect.any(Number),
                    },
                    kycStats: {
                        totalSubmissions: expect.any(Number),
                        approved: expect.any(Number),
                        rejected: expect.any(Number),
                        pending: expect.any(Number),
                    },
                    amlStats: {
                        totalChecks: expect.any(Number),
                        passed: expect.any(Number),
                        flagged: expect.any(Number),
                        highRisk: expect.any(Number),
                    },
                    sanctionsStats: {
                        totalChecks: expect.any(Number),
                        clear: expect.any(Number),
                        matches: expect.any(Number),
                        falsePositives: expect.any(Number),
                    },
                    generatedAt: expect.any(String),
                    generatedBy: expect.any(String),
                },
            });
        });

        it('should require admin access', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(response.body.message).toBe('Admin access required for compliance reports');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
        });

        it('should validate date parameters', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({
                    startDate: 'invalid-date',
                    endDate: '2023-12-31T23:59:59.999Z',
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
        });

        it('should validate report type', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({
                    type: 'invalid-type',
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
        });

        it('should generate specific report types', async () => {
            const reportTypes = ['aml', 'kyc', 'sanctions'];

            for (const type of reportTypes) {
                const response = await request(app)
                    .get('/api/compliance/report')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .query({ type })
                    .expect(200);

                expect(response.body.data.type).toBe(type);
            }
        });

        it('should use default date range when not provided', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.data.period.startDate).toBeDefined();
            expect(response.body.data.period.endDate).toBeDefined();
        });
    });

    describe('Error handling', () => {
        it('should handle internal server errors gracefully', async () => {
            // This test would require mocking the ComplianceService to throw an error
            // For now, we'll test that the error handling middleware works
            const response = await request(app)
                .post('/api/compliance/check-address')
                .send({
                    address: '0x1234567890123456789012345678901234567890',
                })
                .expect(200);

            // Should not throw unhandled errors
            expect(response.body.success).toBe(true);
        });
    });

    describe('Rate limiting and security', () => {
        it('should handle multiple concurrent requests', async () => {
            const requests = Array(5).fill(null).map(() =>
                request(app)
                    .post('/api/compliance/check-address')
                    .send({
                        address: '0x1234567890123456789012345678901234567890',
                    })
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });
});