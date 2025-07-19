import { ApiClient } from '../client/api-client';

/**
 * Interface for address risk assessment
 */
export interface AddressRiskAssessment {
  address: string;
  isCompliant: boolean;
  riskLevel: string;
  riskScore: number;
  sanctions: boolean;
  pep: boolean;
  amlFlags: string[];
  lastChecked: string;
  source: string;
}

/**
 * Interface for compliance status
 */
export interface ComplianceStatus {
  address: string;
  status: string;
  riskScore: number;
  riskLevel: string;
  lastUpdated: string;
  kycStatus: string;
  amlStatus: string;
  restrictions: string[];
  approvedCountries: string[];
  blockedCountries: string[];
}

/**
 * Interface for KYC submission
 */
export interface KYCSubmission {
  userId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  documentUrl?: string;
}

/**
 * Interface for KYC submission result
 */
export interface KYCSubmissionResult {
  submissionId: string;
  userId: string;
  status: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  documentUrl?: string;
  submittedAt: string;
  estimatedProcessingTime: string;
}

/**
 * Interface for KYC status
 */
export interface KYCStatus {
  userId: string;
  status: string;
  verificationLevel: string;
  submittedAt: string;
  approvedAt?: string;
  expiresAt?: string;
  documents: Array<{
    type: string;
    status: string;
    verifiedAt?: string;
  }>;
  limits: {
    daily: number;
    monthly: number;
    annual: number;
  };
}

/**
 * Interface for transaction verification
 */
export interface TransactionVerification {
  transactionId: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
}

/**
 * Interface for transaction verification result
 */
export interface TransactionVerificationResult {
  transactionId: string;
  status: string;
  riskScore: number;
  riskLevel: string;
  amlCheck: string;
  sanctionsCheck: string;
  pepCheck: string;
  fromAddress: {
    address: string;
    riskLevel: string;
    isBlacklisted: boolean;
  };
  toAddress: {
    address: string;
    riskLevel: string;
    isBlacklisted: boolean;
  };
  amount: number;
  currency: string;
  verifiedAt: string;
  flags: string[];
  recommendations: string[];
}

/**
 * Interface for sanctions check
 */
export interface SanctionsCheck {
  name: string;
  address?: string;
}

/**
 * Interface for sanctions check result
 */
export interface SanctionsCheckResult {
  name: string;
  address?: string;
  isMatch: boolean;
  confidence: number;
  matches: any[];
  checkedAt: string;
  status: string;
}

/**
 * Interface for risk assessment
 */
export interface RiskAssessment {
  address: string;
  transactionCount?: number;
  totalVolume?: number;
}

/**
 * Interface for risk assessment result
 */
export interface RiskAssessmentResult {
  address: string;
  baseRiskScore: number;
  velocityRiskScore: number;
  volumeRiskScore: number;
  combinedRiskScore: number;
  riskLevel: string;
  sanctions: boolean;
  pep: boolean;
  flags: string[];
  recommendations: string[];
  assessedAt: string;
}

/**
 * Interface for compliance report
 */
export interface ComplianceReport {
  reportId: string;
  type: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTransactions: number;
    flaggedTransactions: number;
    approvedTransactions: number;
    rejectedTransactions: number;
    pendingReview: number;
  };
  kycStats: {
    totalSubmissions: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  amlStats: {
    totalChecks: number;
    passed: number;
    flagged: number;
    highRisk: number;
  };
  sanctionsStats: {
    totalChecks: number;
    clear: number;
    matches: number;
    falsePositives: number;
  };
  generatedAt: string;
  generatedBy: string;
}

/**
 * Interface for merchant compliance check
 */
export interface MerchantComplianceCheck {
  merchantId: string;
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
  checkedAt: string;
}

/**
 * Interface for document upload
 */
export interface DocumentUpload {
  userId: string;
  documentType: string;
  documentBase64: string;
  fileName: string;
}

/**
 * Interface for document upload result
 */
export interface DocumentUploadResult {
  userId: string;
  documentType: string;
  documentUrl: string;
  uploadedAt: string;
}

/**
 * Interface for audit trail query
 */
export interface AuditTrailQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

/**
 * Interface for audit trail entry
 */
export interface AuditTrailEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  data?: any;
  createdAt: string;
}

/**
 * Interface for audit trail result
 */
export interface AuditTrailResult {
  total: number;
  entries: AuditTrailEntry[];
}

/**
 * Compliance service for interacting with compliance APIs
 */
export class ComplianceService {
  private apiClient: ApiClient;

  /**
   * Create a new ComplianceService
   * @param apiClient API client for making requests
   */
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Check address compliance
   * @param address Ethereum address to check
   * @returns Address risk assessment
   */
  public async checkAddress(address: string): Promise<AddressRiskAssessment> {
    const response = await this.apiClient.post('/compliance/check-address', { address });
    return response.data;
  }

  /**
   * Get compliance status for an address
   * @param address Ethereum address to check
   * @returns Compliance status
   */
  public async getComplianceStatus(address: string): Promise<ComplianceStatus> {
    const response = await this.apiClient.get(`/compliance/status/${address}`);
    return response.data;
  }

  /**
   * Submit KYC documents for verification
   * @param submission KYC submission data
   * @returns KYC submission result
   */
  public async submitKYC(submission: KYCSubmission): Promise<KYCSubmissionResult> {
    const response = await this.apiClient.post('/compliance/kyc', submission);
    return response.data;
  }

  /**
   * Get KYC status for a user
   * @param userId User ID
   * @returns KYC status
   */
  public async getKYCStatus(userId: string): Promise<KYCStatus> {
    const response = await this.apiClient.get(`/compliance/kyc/${userId}/status`);
    return response.data;
  }

  /**
   * Verify transaction compliance
   * @param transaction Transaction data to verify
   * @returns Transaction verification result
   */
  public async verifyTransaction(transaction: TransactionVerification): Promise<TransactionVerificationResult> {
    const response = await this.apiClient.post('/compliance/transaction/verify', transaction);
    return response.data;
  }

  /**
   * Check name against sanctions lists
   * @param check Sanctions check data
   * @returns Sanctions check result
   */
  public async checkSanctions(check: SanctionsCheck): Promise<SanctionsCheckResult> {
    const response = await this.apiClient.post('/compliance/sanctions/check', check);
    return response.data;
  }

  /**
   * Assess risk for an address
   * @param assessment Risk assessment data
   * @returns Risk assessment result
   */
  public async assessRisk(assessment: RiskAssessment): Promise<RiskAssessmentResult> {
    const response = await this.apiClient.post('/compliance/risk/assess', assessment);
    return response.data;
  }

  /**
   * Generate compliance report
   * @param startDate Start date for report period
   * @param endDate End date for report period
   * @param type Report type (aml, kyc, sanctions, all)
   * @returns Compliance report
   */
  public async generateReport(startDate?: Date, endDate?: Date, type?: string): Promise<ComplianceReport> {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    if (type) params.type = type;

    const response = await this.apiClient.get('/compliance/report', { params });
    return response.data;
  }

  /**
   * Check merchant compliance
   * @param merchantId Merchant ID
   * @returns Merchant compliance check result
   */
  public async checkMerchant(merchantId: string): Promise<MerchantComplianceCheck> {
    const response = await this.apiClient.get(`/compliance/merchant/${merchantId}`);
    return response.data;
  }

  /**
   * Upload KYC document
   * @param upload Document upload data
   * @returns Document upload result
   */
  public async uploadDocument(upload: DocumentUpload): Promise<DocumentUploadResult> {
    const response = await this.apiClient.post('/compliance/document/upload', upload);
    return response.data;
  }

  /**
   * Get compliance audit trail
   * @param query Audit trail query parameters
   * @returns Audit trail result
   */
  public async getAuditTrail(query: AuditTrailQuery = {}): Promise<AuditTrailResult> {
    const response = await this.apiClient.get('/compliance/audit-trail', { params: query });
    return response.data;
  }
}