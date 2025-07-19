import request from 'supertest';
import express from 'express';
import { complianceRouter } from '../../src/routes/compliance';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ComplianceService } from '../../src/services/ComplianceService';

// Mock ComplianceService
jest.mock('../../src/services/ComplianceService');
const MockComplianceService = ComplianceService as jest.MockedClass<typeof ComplianceService>;

// Mock Prisma
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
    let mockComplianceService: jest.Mocked<ComplianceService>;

    beforeAll(() => {
        // Generate test IDs
        testUserId = 'user-123';
        testMerchantId = 'merchant-123';

        // Generate JWT tokens
        authToken = jwt.sign(
            { userId: testUserId, role: 'USER' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        adminToken = jwt.sign(
            { userId: 'admin-123', role: 'ADMIN' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Setup mock ComplianceService
        mockComplianceService = MockComplianceService.mock.instances[0] as jest.Mocked<ComplianceService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/compliance/check-address', () => {
        it('should check address compliance successfully', async () => {
            // Mock the ComplianceService.checkAddress method
            mockComplianceService.checkAddress.mockResolvedValue({
                address: '0x1234567890123456789012345678901234567890',
                riskScore: 25,
                riskLevel: 'LOW',
                sanctions: false,
                pep: false,
                amlFlags: [],
                source: 'chainalysis',
                lastChecked: new Date()
            });

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
                    isCompliant: true,
                    riskLevel: 'low',
                    sanctions: false,
                    pep: false,
                    amlFlags: [],
                    source: 'chainalysis',
                }
            });

            expect(mockComplianceService.checkAddress).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        });

        it('should return 400 for invalid address', async () => {
            const response = await request(app)
                .post('/api/compliance/check-address')
                .send({
                    address: 'invalid-address',
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.checkAddress).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/compliance/status/:address', () => {
        it('should get compliance status successfully', async () => {
            // Mock the ComplianceService.checkAddress method
            mockComplianceService.checkAddress.mockResolvedValue({
                address: '0x1234567890123456789012345678901234567890',
                riskScore: 25,
                riskLevel: 'LOW',
                sanctions: false,
                pep: false,
                amlFlags: [],
                source: 'chainalysis',
                lastChecked: new Date()
            });

            const response = await request(app)
                .get('/api/compliance/status/0x1234567890123456789012345678901234567890')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    address: '0x1234567890123456789012345678901234567890',
                    status: 'approved',
                    riskScore: 25,
                    riskLevel: 'low',
                    kycStatus: 'verified',
                    amlStatus: 'clear',
                    restrictions: [],
                    approvedCountries: expect.any(Array),
                    blockedCountries: expect.any(Array)
                }
            });

            expect(mockComplianceService.checkAddress).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        });

        it('should return 400 for invalid address parameter', async () => {
            const response = await request(app)
                .get('/api/compliance/status/invalid-address')
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.checkAddress).not.toHaveBeenCalled();
        });

        it('should handle high-risk addresses', async () => {
            // Mock the ComplianceService.checkAddress method for high-risk address
            mockComplianceService.checkAddress.mockResolvedValue({
                address: '0x1234567890123456789012345678901234567890',
                riskScore: 85,
                riskLevel: 'VERY_HIGH',
                sanctions: false,
                pep: true,
                amlFlags: ['HIGH_VOLUME', 'SUSPICIOUS_PATTERN'],
                source: 'chainalysis',
                lastChecked: new Date()
            });

            const response = await request(app)
                .get('/api/compliance/status/0x1234567890123456789012345678901234567890')
                .expect(200);

            expect(response.body.data.status).toBe('restricted');
            expect(response.body.data.restrictions.length).toBeGreaterThan(0);
            expect(response.body.data.kycStatus).toBe('required');
        });

        it('should handle sanctioned addresses', async () => {
            // Mock the ComplianceService.checkAddress method for sanctioned address
            mockComplianceService.checkAddress.mockResolvedValue({
                address: '0x1234567890123456789012345678901234567890',
                riskScore: 95,
                riskLevel: 'VERY_HIGH',
                sanctions: true,
                pep: true,
                amlFlags: ['SANCTIONS_MATCH', 'HIGH_VOLUME'],
                source: 'chainalysis',
                lastChecked: new Date()
            });

            const response = await request(app)
                .get('/api/compliance/status/0x1234567890123456789012345678901234567890')
                .expect(200);

            expect(response.body.data.status).toBe('blocked');
            expect(response.body.data.amlStatus).toBe('flagged');
            expect(response.body.data.approvedCountries).toEqual([]);
            expect(response.body.data.blockedCountries).toEqual(['ALL']);
        });
    });

    describe('POST /api/compliance/kyc', () => {
        const validKYCData = {
            userId: testUserId,
            documentType: 'passport',
            documentNumber: 'AB123456',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            address: '123 Main St, City, Country',
            documentUrl: 'https://example.com/document.jpg',
        };

        it('should submit KYC documents successfully', async () => {
            // Mock the ComplianceService.performKYC method
            mockComplianceService.performKYC.mockResolvedValue({
                submissionId: 'kyc-123',
                status: 'PENDING',
                estimatedProcessingTime: '24-48 hours'
            });

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validKYCData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: 'KYC documents submitted successfully',
                data: {
                    submissionId: 'kyc-123',
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
                    estimatedProcessingTime: '24-48 hours'
                }
            });

            expect(mockComplianceService.performKYC).toHaveBeenCalledWith(expect.objectContaining({
                userId: testUserId,
                documentType: 'passport',
                documentNumber: 'AB123456'
            }));
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/compliance/kyc')
                .send(validKYCData)
                .expect(401);

            expect(mockComplianceService.performKYC).not.toHaveBeenCalled();
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
            expect(mockComplianceService.performKYC).not.toHaveBeenCalled();
        });

        it('should allow admins to submit KYC for any user', async () => {
            // Mock the ComplianceService.performKYC method
            mockComplianceService.performKYC.mockResolvedValue({
                submissionId: 'kyc-123',
                status: 'PENDING',
                estimatedProcessingTime: '24-48 hours'
            });

            const kycData = { ...validKYCData, userId: 'other-user-id' };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(kycData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(mockComplianceService.performKYC).toHaveBeenCalled();
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
            expect(mockComplianceService.performKYC).not.toHaveBeenCalled();
        });

        it('should validate document type', async () => {
            const invalidKYCData = {
                ...validKYCData,
                documentType: 'invalid_type',
            };

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidKYCData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.performKYC).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
            // Mock the ComplianceService.performKYC method to throw an error
            mockComplianceService.performKYC.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .post('/api/compliance/kyc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validKYCData)
                .expect(500);

            expect(response.body.error).toBe('Internal Server Error');
            expect(mockComplianceService.performKYC).toHaveBeenCalled();
        });
    });

    describe('GET /api/compliance/kyc/:userId/status', () => {
        beforeEach(() => {
            // Mock the ComplianceService.getUserKYCStatus method
            mockComplianceService.getUserKYCStatus.mockResolvedValue({
                id: testUserId,
                kycStatus: 'APPROVED',
                kycSubmittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                kycApprovedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                documents: [
                    {
                        type: 'passport',
                        status: 'approved',
                        verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
                    }
                ]
            });
        });

        it('should get KYC status for own user', async () => {
            const response = await request(app)
                .get(`/api/compliance/kyc/${testUserId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    userId: testUserId,
                    status: 'approved',
                    verificationLevel: 'full',
                    submittedAt: expect.any(String),
                    approvedAt: expect.any(String),
                    expiresAt: expect.any(String),
                    documents: expect.any(Array),
                    limits: {
                        daily: expect.any(Number),
                        monthly: expect.any(Number),
                        annual: expect.any(Number)
                    }
                }
            });

            expect(mockComplianceService.getUserKYCStatus).toHaveBeenCalledWith(testUserId);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get(`/api/compliance/kyc/${testUserId}/status`)
                .expect(401);

            expect(mockComplianceService.getUserKYCStatus).not.toHaveBeenCalled();
        });

        it('should prevent users from accessing other users KYC status', async () => {
            const response = await request(app)
                .get('/api/compliance/kyc/other-user-id/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(response.body.message).toBe('Access denied to KYC status');
            expect(mockComplianceService.getUserKYCStatus).not.toHaveBeenCalled();
        });

        it('should allow admins to access any user KYC status', async () => {
            const response = await request(app)
                .get(`/api/compliance/kyc/other-user-id/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockComplianceService.getUserKYCStatus).toHaveBeenCalledWith('other-user-id');
        });

        it('should handle user not found', async () => {
            // Mock the ComplianceService.getUserKYCStatus method to return null
            mockComplianceService.getUserKYCStatus.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/compliance/kyc/${testUserId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Not Found');
            expect(mockComplianceService.getUserKYCStatus).toHaveBeenCalled();
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

        beforeEach(() => {
            // Mock the ComplianceService.assessTransactionRisk method
            mockComplianceService.assessTransactionRisk.mockResolvedValue({
                transactionId: 'tx_123456789',
                fromAddress: '0x1234567890123456789012345678901234567890',
                toAddress: '0x0987654321098765432109876543210987654321',
                amount: 1000.5,
                currency: 'USD',
                riskScore: 25,
                riskLevel: 'LOW',
                flags: [],
                recommendations: []
            });
        });

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
                    status: 'approved',
                    riskScore: 25,
                    riskLevel: 'low',
                    amlCheck: 'passed',
                    sanctionsCheck: 'passed',
                    pepCheck: 'passed',
                    fromAddress: {
                        address: validTransactionData.fromAddress,
                        riskLevel: 'low',
                        isBlacklisted: false
                    },
                    toAddress: {
                        address: validTransactionData.toAddress,
                        riskLevel: 'low',
                        isBlacklisted: false
                    },
                    amount: 1000.5,
                    currency: 'USD',
                    verifiedAt: expect.any(String),
                    flags: [],
                    recommendations: []
                }
            });

            expect(mockComplianceService.assessTransactionRisk).toHaveBeenCalledWith({
                transactionId: 'tx_123456789',
                fromAddress: '0x1234567890123456789012345678901234567890',
                toAddress: '0x0987654321098765432109876543210987654321',
                amount: 1000.5,
                currency: 'USD'
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .send(validTransactionData)
                .expect(401);

            expect(mockComplianceService.assessTransactionRisk).not.toHaveBeenCalled();
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
            expect(mockComplianceService.assessTransactionRisk).not.toHaveBeenCalled();
        });

        it('should handle high-risk transactions', async () => {
            // Mock the ComplianceService.assessTransactionRisk method for high-risk transaction
            mockComplianceService.assessTransactionRisk.mockResolvedValue({
                transactionId: 'tx_123456789',
                fromAddress: '0x1234567890123456789012345678901234567890',
                toAddress: '0x0987654321098765432109876543210987654321',
                amount: 1000.5,
                currency: 'USD',
                riskScore: 75,
                riskLevel: 'HIGH',
                flags: ['HIGH_VALUE_TRANSACTION', 'SUSPICIOUS_PATTERN'],
                recommendations: ['Require additional verification', 'Monitor closely']
            });

            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validTransactionData)
                .expect(200);

            expect(response.body.data.status).toBe('review_required');
            expect(response.body.data.riskLevel).toBe('high');
            expect(response.body.data.amlCheck).toBe('flagged');
            expect(response.body.data.flags).toContain('HIGH_VALUE_TRANSACTION');
            expect(response.body.data.recommendations).toContain('Require additional verification');
        });

        it('should handle very high-risk transactions', async () => {
            // Mock the ComplianceService.assessTransactionRisk method for very high-risk transaction
            mockComplianceService.assessTransactionRisk.mockResolvedValue({
                transactionId: 'tx_123456789',
                fromAddress: '0x1234567890123456789012345678901234567890',
                toAddress: '0x0987654321098765432109876543210987654321',
                amount: 1000.5,
                currency: 'USD',
                riskScore: 90,
                riskLevel: 'VERY_HIGH',
                flags: ['SANCTIONS_MATCH', 'HIGH_VALUE_TRANSACTION'],
                recommendations: ['Block transaction and conduct manual review']
            });

            const response = await request(app)
                .post('/api/compliance/transaction/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validTransactionData)
                .expect(200);

            expect(response.body.data.status).toBe('rejected');
            expect(response.body.data.riskLevel).toBe('very_high');
            expect(response.body.data.sanctionsCheck).toBe('failed');
            expect(response.body.data.flags).toContain('SANCTIONS_MATCH');
        });
    });

    describe('GET /api/compliance/report', () => {
        beforeEach(() => {
            // Mock the ComplianceService.generateComplianceReport method
            mockComplianceService.generateComplianceReport.mockResolvedValue({
                reportId: 'report-123',
                type: 'all',
                period: {
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                },
                summary: {
                    totalTransactions: 1250,
                    flaggedTransactions: 15,
                    approvedTransactions: 1200,
                    rejectedTransactions: 35,
                    pendingReview: 0
                },
                kycStats: {
                    totalSubmissions: 450,
                    approved: 420,
                    rejected: 20,
                    pending: 10
                },
                amlStats: {
                    totalChecks: 1250,
                    passed: 1200,
                    flagged: 50,
                    highRisk: 5
                },
                sanctionsStats: {
                    totalChecks: 1250,
                    clear: 1245,
                    matches: 5,
                    falsePositives: 3
                }
            });
        });

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
                    reportId: 'report-123',
                    type: 'all',
                    period: {
                        startDate: expect.any(String),
                        endDate: expect.any(String),
                    },
                    summary: {
                        totalTransactions: 1250,
                        flaggedTransactions: 15,
                        approvedTransactions: 1200,
                        rejectedTransactions: 35,
                        pendingReview: 0
                    },
                    kycStats: {
                        totalSubmissions: 450,
                        approved: 420,
                        rejected: 20,
                        pending: 10
                    },
                    amlStats: {
                        totalChecks: 1250,
                        passed: 1200,
                        flagged: 50,
                        highRisk: 5
                    },
                    sanctionsStats: {
                        totalChecks: 1250,
                        clear: 1245,
                        matches: 5,
                        falsePositives: 3
                    },
                    generatedAt: expect.any(String),
                    generatedBy: expect.any(String)
                }
            });

            expect(mockComplianceService.generateComplianceReport).toHaveBeenCalledWith(
                new Date('2023-01-01T00:00:00.000Z'),
                new Date('2023-12-31T23:59:59.999Z'),
                'all'
            );
        });

        it('should require admin access', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(response.body.message).toBe('Admin access required for compliance reports');
            expect(mockComplianceService.generateComplianceReport).not.toHaveBeenCalled();
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/compliance/report')
                .expect(401);

            expect(mockComplianceService.generateComplianceReport).not.toHaveBeenCalled();
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
            expect(mockComplianceService.generateComplianceReport).not.toHaveBeenCalled();
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
            expect(mockComplianceService.generateComplianceReport).not.toHaveBeenCalled();
        });

        it('should generate specific report types', async () => {
            const reportTypes = ['aml', 'kyc', 'sanctions'];

            for (const type of reportTypes) {
                // Reset mock for each iteration
                mockComplianceService.generateComplianceReport.mockClear();
                
                // Mock the ComplianceService.generateComplianceReport method for specific type
                mockComplianceService.generateComplianceReport.mockResolvedValue({
                    reportId: `report-${type}`,
                    type: type as any,
                    period: {
                        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        endDate: new Date()
                    },
                    summary: {
                        totalTransactions: 1250,
                        flaggedTransactions: 15,
                        approvedTransactions: 1200,
                        rejectedTransactions: 35,
                        pendingReview: 0
                    },
                    kycStats: {
                        totalSubmissions: 450,
                        approved: 420,
                        rejected: 20,
                        pending: 10
                    },
                    amlStats: {
                        totalChecks: 1250,
                        passed: 1200,
                        flagged: 50,
                        highRisk: 5
                    },
                    sanctionsStats: {
                        totalChecks: 1250,
                        clear: 1245,
                        matches: 5,
                        falsePositives: 3
                    }
                });

                const response = await request(app)
                    .get('/api/compliance/report')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .query({ type })
                    .expect(200);

                expect(response.body.data.type).toBe(type);
                expect(mockComplianceService.generateComplianceReport).toHaveBeenCalledWith(
                    expect.any(Date),
                    expect.any(Date),
                    type as any
                );
            }
        });
    });

    describe('POST /api/compliance/sanctions/check', () => {
        beforeEach(() => {
            // Mock the ComplianceService.checkSanctionsList method
            mockComplianceService.checkSanctionsList.mockResolvedValue({
                isMatch: false,
                matches: [],
                confidence: 0
            });
        });

        it('should check sanctions list successfully', async () => {
            const response = await request(app)
                .post('/api/compliance/sanctions/check')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'John Smith',
                    address: '0x1234567890123456789012345678901234567890'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    name: 'John Smith',
                    address: '0x1234567890123456789012345678901234567890',
                    isMatch: false,
                    confidence: 0,
                    matches: [],
                    checkedAt: expect.any(String),
                    status: 'approved'
                }
            });

            expect(mockComplianceService.checkSanctionsList).toHaveBeenCalledWith(
                'John Smith',
                '0x1234567890123456789012345678901234567890'
            );
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/compliance/sanctions/check')
                .send({
                    name: 'John Smith',
                    address: '0x1234567890123456789012345678901234567890'
                })
                .expect(401);

            expect(mockComplianceService.checkSanctionsList).not.toHaveBeenCalled();
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/compliance/sanctions/check')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    // Missing name
                    address: '0x1234567890123456789012345678901234567890'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.checkSanctionsList).not.toHaveBeenCalled();
        });

        it('should validate address format', async () => {
            const response = await request(app)
                .post('/api/compliance/sanctions/check')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'John Smith',
                    address: 'invalid-address'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.checkSanctionsList).not.toHaveBeenCalled();
        });

        it('should handle sanctions matches', async () => {
            // Mock the ComplianceService.checkSanctionsList method for a match
            mockComplianceService.checkSanctionsList.mockResolvedValue({
                isMatch: true,
                matches: [
                    {
                        name: 'John Smith',
                        listName: 'OFAC',
                        confidence: 0.95,
                        matchType: 'name',
                        details: 'Match found in OFAC sanctions list'
                    }
                ],
                confidence: 0.95
            });

            const response = await request(app)
                .post('/api/compliance/sanctions/check')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'John Smith',
                    address: '0x1234567890123456789012345678901234567890'
                })
                .expect(200);

            expect(response.body.data.isMatch).toBe(true);
            expect(response.body.data.confidence).toBe(0.95);
            expect(response.body.data.matches.length).toBe(1);
            expect(response.body.data.status).toBe('blocked');
        });
    });

    describe('GET /api/compliance/merchant/:merchantId', () => {
        beforeEach(() => {
            // Mock the ComplianceService.checkMerchant method
            mockComplianceService.checkMerchant.mockResolvedValue({
                isCompliant: true,
                issues: [],
                recommendations: []
            });
        });

        it('should check merchant compliance successfully', async () => {
            const response = await request(app)
                .get(`/api/compliance/merchant/${testMerchantId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    merchantId: testMerchantId,
                    isCompliant: true,
                    issues: [],
                    recommendations: [],
                    checkedAt: expect.any(String)
                }
            });

            expect(mockComplianceService.checkMerchant).toHaveBeenCalledWith(testMerchantId);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get(`/api/compliance/merchant/${testMerchantId}`)
                .expect(401);

            expect(mockComplianceService.checkMerchant).not.toHaveBeenCalled();
        });

        it('should restrict access to admin or merchant owner', async () => {
            const response = await request(app)
                .get(`/api/compliance/merchant/other-merchant-id`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(mockComplianceService.checkMerchant).not.toHaveBeenCalled();
        });

        it('should handle non-compliant merchants', async () => {
            // Mock the ComplianceService.checkMerchant method for non-compliant merchant
            mockComplianceService.checkMerchant.mockResolvedValue({
                isCompliant: false,
                issues: ['Missing tax identification', 'Incomplete business information'],
                recommendations: ['Provide valid tax identification number', 'Provide complete business registration details']
            });

            const response = await request(app)
                .get(`/api/compliance/merchant/${testMerchantId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.data.isCompliant).toBe(false);
            expect(response.body.data.issues.length).toBe(2);
            expect(response.body.data.recommendations.length).toBe(2);
        });

        it('should handle merchant not found', async () => {
            // Mock the ComplianceService.checkMerchant method to throw an error
            mockComplianceService.checkMerchant.mockRejectedValue(new Error('Merchant not found'));

            const response = await request(app)
                .get(`/api/compliance/merchant/${testMerchantId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(500);

            expect(response.body.error).toBe('Internal Server Error');
            expect(mockComplianceService.checkMerchant).toHaveBeenCalled();
        });
    });

    describe('POST /api/compliance/document/upload', () => {
        const validDocumentData = {
            userId: testUserId,
            documentType: 'passport',
            documentBase64: 'SGVsbG8gV29ybGQ=', // Base64 for "Hello World"
            fileName: 'passport.jpg'
        };

        beforeEach(() => {
            // Mock the ComplianceService.uploadDocument method
            mockComplianceService.uploadDocument.mockResolvedValue('https://storage.example.com/documents/user-123/passport/123456_passport.jpg');
        });

        it('should upload document successfully', async () => {
            const response = await request(app)
                .post('/api/compliance/document/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validDocumentData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Document uploaded successfully',
                data: {
                    userId: testUserId,
                    documentType: 'passport',
                    documentUrl: expect.stringContaining('https://'),
                    uploadedAt: expect.any(String)
                }
            });

            expect(mockComplianceService.uploadDocument).toHaveBeenCalledWith(
                testUserId,
                'passport',
                'SGVsbG8gV29ybGQ=',
                'passport.jpg'
            );
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/compliance/document/upload')
                .send(validDocumentData)
                .expect(401);

            expect(mockComplianceService.uploadDocument).not.toHaveBeenCalled();
        });

        it('should prevent users from uploading documents for other users', async () => {
            const documentData = { ...validDocumentData, userId: 'other-user-id' };

            const response = await request(app)
                .post('/api/compliance/document/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .send(documentData)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(mockComplianceService.uploadDocument).not.toHaveBeenCalled();
        });

        it('should allow admins to upload documents for any user', async () => {
            const documentData = { ...validDocumentData, userId: 'other-user-id' };

            const response = await request(app)
                .post('/api/compliance/document/upload')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(documentData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(mockComplianceService.uploadDocument).toHaveBeenCalled();
        });

        it('should validate document type', async () => {
            const invalidDocumentData = {
                ...validDocumentData,
                documentType: 'invalid_type'
            };

            const response = await request(app)
                .post('/api/compliance/document/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidDocumentData)
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.uploadDocument).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
            // Mock the ComplianceService.uploadDocument method to throw an error
            mockComplianceService.uploadDocument.mockRejectedValue(new Error('Invalid document format'));

            const response = await request(app)
                .post('/api/compliance/document/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validDocumentData)
                .expect(500);

            expect(response.body.error).toBe('Internal Server Error');
            expect(mockComplianceService.uploadDocument).toHaveBeenCalled();
        });
    });

    describe('GET /api/compliance/audit-trail', () => {
        beforeEach(() => {
            // Mock the ComplianceService.getAuditTrail method
            mockComplianceService.getAuditTrail.mockResolvedValue({
                total: 2,
                entries: [
                    {
                        id: 'audit-1',
                        action: 'KYC_APPROVED',
                        entityType: 'USER',
                        entityId: testUserId,
                        userId: 'admin-123',
                        data: { documentType: 'passport' },
                        createdAt: new Date()
                    },
                    {
                        id: 'audit-2',
                        action: 'SANCTIONS_CHECK',
                        entityType: 'USER',
                        entityId: testUserId,
                        data: { isMatch: false },
                        createdAt: new Date()
                    }
                ]
            });
        });

        it('should get audit trail for admin', async () => {
            const response = await request(app)
                .get('/api/compliance/audit-trail')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({
                    startDate: '2023-01-01T00:00:00.000Z',
                    endDate: '2023-12-31T23:59:59.999Z',
                    userId: testUserId,
                    action: 'KYC_APPROVED',
                    limit: 10,
                    offset: 0
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    total: 2,
                    entries: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'audit-1',
                            action: 'KYC_APPROVED',
                            entityType: 'USER',
                            entityId: testUserId
                        })
                    ])
                }
            });

            expect(mockComplianceService.getAuditTrail).toHaveBeenCalledWith(
                new Date('2023-01-01T00:00:00.000Z'),
                new Date('2023-12-31T23:59:59.999Z'),
                testUserId,
                'KYC_APPROVED',
                10,
                0
            );
        });

        it('should require admin access', async () => {
            const response = await request(app)
                .get('/api/compliance/audit-trail')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toBe('Forbidden');
            expect(response.body.message).toBe('Admin access required for audit trail');
            expect(mockComplianceService.getAuditTrail).not.toHaveBeenCalled();
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/compliance/audit-trail')
                .expect(401);

            expect(mockComplianceService.getAuditTrail).not.toHaveBeenCalled();
        });

        it('should validate query parameters', async () => {
            const response = await request(app)
                .get('/api/compliance/audit-trail')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({
                    startDate: 'invalid-date',
                    limit: 'invalid-limit'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.getAuditTrail).not.toHaveBeenCalled();
        });

        it('should use default values for missing parameters', async () => {
            await request(app)
                .get('/api/compliance/audit-trail')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(mockComplianceService.getAuditTrail).toHaveBeenCalledWith(
                expect.any(Date), // Default start date
                expect.any(Date), // Default end date
                undefined, // No userId filter
                undefined, // No action filter
                50, // Default limit
                0 // Default offset
            );
        });
    });

    describe('POST /api/compliance/risk/assess', () => {
        beforeEach(() => {
            // Mock the ComplianceService.checkAddress method
            mockComplianceService.checkAddress.mockResolvedValue({
                address: '0x1234567890123456789012345678901234567890',
                riskScore: 25,
                riskLevel: 'LOW',
                sanctions: false,
                pep: false,
                amlFlags: [],
                source: 'chainalysis',
                lastChecked: new Date()
            });
        });

        it('should assess risk successfully', async () => {
            const response = await request(app)
                .post('/api/compliance/risk/assess')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    address: '0x1234567890123456789012345678901234567890',
                    transactionCount: 5,
                    totalVolume: 5000
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    address: '0x1234567890123456789012345678901234567890',
                    baseRiskScore: 25,
                    velocityRiskScore: expect.any(Number),
                    volumeRiskScore: expect.any(Number),
                    combinedRiskScore: expect.any(Number),
                    riskLevel: expect.stringMatching(/^(LOW|MEDIUM|HIGH|VERY_HIGH)$/),
                    sanctions: false,
                    pep: false,
                    flags: [],
                    recommendations: expect.any(Array),
                    assessedAt: expect.any(String)
                }
            });

            expect(mockComplianceService.checkAddress).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/compliance/risk/assess')
                .send({
                    address: '0x1234567890123456789012345678901234567890'
                })
                .expect(401);

            expect(mockComplianceService.checkAddress).not.toHaveBeenCalled();
        });

        it('should validate address format', async () => {
            const response = await request(app)
                .post('/api/compliance/risk/assess')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    address: 'invalid-address'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.checkAddress).not.toHaveBeenCalled();
        });

        it('should handle high-risk addresses', async () => {
            // Mock the ComplianceService.checkAddress method for high-risk address
            mockComplianceService.checkAddress.mockResolvedValue({
                address: '0x1234567890123456789012345678901234567890',
                riskScore: 85,
                riskLevel: 'VERY_HIGH',
                sanctions: true,
                pep: true,
                amlFlags: ['HIGH_RISK', 'SANCTIONS_MATCH'],
                source: 'chainalysis',
                lastChecked: new Date()
            });

            const response = await request(app)
                .post('/api/compliance/risk/assess')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    address: '0x1234567890123456789012345678901234567890'
                })
                .expect(200);

            expect(response.body.data.baseRiskScore).toBe(85);
            expect(response.body.data.riskLevel).toBe('VERY_HIGH');
            expect(response.body.data.sanctions).toBe(true);
            expect(response.body.data.pep).toBe(true);
            expect(response.body.data.flags).toContain('HIGH_RISK');
            expect(response.body.data.recommendations).toContain('Block all transactions');
        });

        it('should validate optional parameters', async () => {
            const response = await request(app)
                .post('/api/compliance/risk/assess')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    address: '0x1234567890123456789012345678901234567890',
                    transactionCount: -5, // Invalid negative value
                    totalVolume: 5000
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockComplianceService.checkAddress).not.toHaveBeenCalled();
        });
    });
});