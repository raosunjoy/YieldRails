import { ComplianceService } from '../compliance';
import { ApiClient } from '../../client/api-client';

// Mock ApiClient
jest.mock('../../client/api-client');
const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock API client
    mockApiClient = new MockApiClient() as jest.Mocked<ApiClient>;
    
    // Create compliance service with mock API client
    complianceService = new ComplianceService(mockApiClient);
  });

  describe('checkAddress', () => {
    it('should check address compliance', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          address: '0x1234567890123456789012345678901234567890',
          isCompliant: true,
          riskLevel: 'low',
          riskScore: 25,
          sanctions: false,
          pep: false,
          amlFlags: [],
          lastChecked: '2023-01-01T00:00:00.000Z',
          source: 'chainalysis'
        }
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.checkAddress('0x1234567890123456789012345678901234567890');

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/compliance/check-address',
        { address: '0x1234567890123456789012345678901234567890' }
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getComplianceStatus', () => {
    it('should get compliance status for an address', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          address: '0x1234567890123456789012345678901234567890',
          status: 'approved',
          riskScore: 25,
          riskLevel: 'low',
          lastUpdated: '2023-01-01T00:00:00.000Z',
          kycStatus: 'verified',
          amlStatus: 'clear',
          restrictions: [],
          approvedCountries: ['US', 'EU', 'UK', 'CA'],
          blockedCountries: ['IR', 'KP', 'SY']
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.getComplianceStatus('0x1234567890123456789012345678901234567890');

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/status/0x1234567890123456789012345678901234567890'
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('submitKYC', () => {
    it('should submit KYC documents for verification', async () => {
      // Mock KYC submission
      const kycSubmission = {
        userId: 'user123',
        documentType: 'passport',
        documentNumber: 'AB123456',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        address: '123 Main St, City, Country',
        documentUrl: 'https://example.com/document.jpg'
      };

      // Mock API response
      const mockResponse = {
        data: {
          submissionId: 'kyc123',
          userId: 'user123',
          status: 'pending',
          documentType: 'passport',
          documentNumber: 'AB123456',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          address: '123 Main St, City, Country',
          documentUrl: 'https://example.com/document.jpg',
          submittedAt: '2023-01-01T00:00:00.000Z',
          estimatedProcessingTime: '24-48 hours'
        }
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.submitKYC(kycSubmission);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/compliance/kyc',
        kycSubmission
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getKYCStatus', () => {
    it('should get KYC status for a user', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          userId: 'user123',
          status: 'approved',
          verificationLevel: 'full',
          submittedAt: '2023-01-01T00:00:00.000Z',
          approvedAt: '2023-01-02T00:00:00.000Z',
          expiresAt: '2024-01-02T00:00:00.000Z',
          documents: [
            {
              type: 'passport',
              status: 'approved',
              verifiedAt: '2023-01-02T00:00:00.000Z'
            }
          ],
          limits: {
            daily: 10000,
            monthly: 100000,
            annual: 1000000
          }
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.getKYCStatus('user123');

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/kyc/user123/status'
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('verifyTransaction', () => {
    it('should verify transaction compliance', async () => {
      // Mock transaction verification
      const transaction = {
        transactionId: 'tx123',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0x0987654321098765432109876543210987654321',
        amount: 1000.5,
        currency: 'USD'
      };

      // Mock API response
      const mockResponse = {
        data: {
          transactionId: 'tx123',
          status: 'approved',
          riskScore: 25,
          riskLevel: 'low',
          amlCheck: 'passed',
          sanctionsCheck: 'passed',
          pepCheck: 'passed',
          fromAddress: {
            address: '0x1234567890123456789012345678901234567890',
            riskLevel: 'low',
            isBlacklisted: false
          },
          toAddress: {
            address: '0x0987654321098765432109876543210987654321',
            riskLevel: 'low',
            isBlacklisted: false
          },
          amount: 1000.5,
          currency: 'USD',
          verifiedAt: '2023-01-01T00:00:00.000Z',
          flags: [],
          recommendations: []
        }
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.verifyTransaction(transaction);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/compliance/transaction/verify',
        transaction
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('checkSanctions', () => {
    it('should check name against sanctions lists', async () => {
      // Mock sanctions check
      const sanctionsCheck = {
        name: 'John Smith',
        address: '0x1234567890123456789012345678901234567890'
      };

      // Mock API response
      const mockResponse = {
        data: {
          name: 'John Smith',
          address: '0x1234567890123456789012345678901234567890',
          isMatch: false,
          confidence: 0,
          matches: [],
          checkedAt: '2023-01-01T00:00:00.000Z',
          status: 'approved'
        }
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.checkSanctions(sanctionsCheck);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/compliance/sanctions/check',
        sanctionsCheck
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('assessRisk', () => {
    it('should assess risk for an address', async () => {
      // Mock risk assessment
      const riskAssessment = {
        address: '0x1234567890123456789012345678901234567890',
        transactionCount: 5,
        totalVolume: 5000
      };

      // Mock API response
      const mockResponse = {
        data: {
          address: '0x1234567890123456789012345678901234567890',
          baseRiskScore: 25,
          velocityRiskScore: 10,
          volumeRiskScore: 5,
          combinedRiskScore: 20,
          riskLevel: 'LOW',
          sanctions: false,
          pep: false,
          flags: [],
          recommendations: [],
          assessedAt: '2023-01-01T00:00:00.000Z'
        }
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.assessRisk(riskAssessment);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/compliance/risk/assess',
        riskAssessment
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('generateReport', () => {
    it('should generate compliance report with default parameters', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          reportId: 'report123',
          type: 'all',
          period: {
            startDate: '2023-01-01T00:00:00.000Z',
            endDate: '2023-01-31T00:00:00.000Z'
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
          generatedAt: '2023-01-31T00:00:00.000Z',
          generatedBy: 'admin123'
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.generateReport();

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/report',
        { params: {} }
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });

    it('should generate compliance report with custom parameters', async () => {
      // Mock dates
      const startDate = new Date('2023-01-01T00:00:00.000Z');
      const endDate = new Date('2023-01-31T00:00:00.000Z');

      // Mock API response
      const mockResponse = {
        data: {
          reportId: 'report123',
          type: 'kyc',
          period: {
            startDate: '2023-01-01T00:00:00.000Z',
            endDate: '2023-01-31T00:00:00.000Z'
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
          generatedAt: '2023-01-31T00:00:00.000Z',
          generatedBy: 'admin123'
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.generateReport(startDate, endDate, 'kyc');

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/report',
        {
          params: {
            startDate: '2023-01-01T00:00:00.000Z',
            endDate: '2023-01-31T00:00:00.000Z',
            type: 'kyc'
          }
        }
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('checkMerchant', () => {
    it('should check merchant compliance', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          merchantId: 'merchant123',
          isCompliant: true,
          issues: [],
          recommendations: [],
          checkedAt: '2023-01-01T00:00:00.000Z'
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.checkMerchant('merchant123');

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/merchant/merchant123'
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('uploadDocument', () => {
    it('should upload KYC document', async () => {
      // Mock document upload
      const documentUpload = {
        userId: 'user123',
        documentType: 'passport',
        documentBase64: 'SGVsbG8gV29ybGQ=', // Base64 for "Hello World"
        fileName: 'passport.jpg'
      };

      // Mock API response
      const mockResponse = {
        data: {
          userId: 'user123',
          documentType: 'passport',
          documentUrl: 'https://storage.example.com/documents/user123/passport/123456_passport.jpg',
          uploadedAt: '2023-01-01T00:00:00.000Z'
        }
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.uploadDocument(documentUpload);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/compliance/document/upload',
        documentUpload
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getAuditTrail', () => {
    it('should get compliance audit trail with default parameters', async () => {
      // Mock API response
      const mockResponse = {
        data: {
          total: 2,
          entries: [
            {
              id: 'audit1',
              action: 'KYC_APPROVED',
              entityType: 'USER',
              entityId: 'user123',
              userId: 'admin123',
              data: { documentType: 'passport' },
              createdAt: '2023-01-02T00:00:00.000Z'
            },
            {
              id: 'audit2',
              action: 'SANCTIONS_CHECK',
              entityType: 'USER',
              entityId: 'user123',
              data: { isMatch: false },
              createdAt: '2023-01-01T00:00:00.000Z'
            }
          ]
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.getAuditTrail();

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/audit-trail',
        { params: {} }
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });

    it('should get compliance audit trail with custom parameters', async () => {
      // Mock audit trail query
      const auditTrailQuery = {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T00:00:00.000Z',
        userId: 'user123',
        action: 'KYC_APPROVED',
        limit: 10,
        offset: 0
      };

      // Mock API response
      const mockResponse = {
        data: {
          total: 1,
          entries: [
            {
              id: 'audit1',
              action: 'KYC_APPROVED',
              entityType: 'USER',
              entityId: 'user123',
              userId: 'admin123',
              data: { documentType: 'passport' },
              createdAt: '2023-01-02T00:00:00.000Z'
            }
          ]
        }
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Call method
      const result = await complianceService.getAuditTrail(auditTrailQuery);

      // Verify API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/compliance/audit-trail',
        { params: auditTrailQuery }
      );

      // Verify result
      expect(result).toEqual(mockResponse.data);
    });
  });
});