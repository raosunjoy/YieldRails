/**
 * Compliance configuration and constants
 */

export const ComplianceConfig = {
    // Chainalysis API Configuration
    chainalysis: {
        apiKey: process.env.CHAINALYSIS_API_KEY || '',
        baseUrl: process.env.CHAINALYSIS_BASE_URL || 'https://api.chainalysis.com',
        timeout: parseInt(process.env.CHAINALYSIS_TIMEOUT || '10000'),
        retryAttempts: parseInt(process.env.CHAINALYSIS_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.CHAINALYSIS_RETRY_DELAY || '1000'),
    },

    // KYC Provider Configuration
    kyc: {
        provider: process.env.KYC_PROVIDER || 'jumio',
        apiKey: process.env.KYC_API_KEY || '',
        apiSecret: process.env.KYC_API_SECRET || '',
        baseUrl: process.env.KYC_BASE_URL || '',
        webhookSecret: process.env.KYC_WEBHOOK_SECRET || '',
        autoApprovalThreshold: parseFloat(process.env.KYC_AUTO_APPROVAL_THRESHOLD || '0.95'),
        manualReviewThreshold: parseFloat(process.env.KYC_MANUAL_REVIEW_THRESHOLD || '0.8'),
    },

    // Risk Assessment Thresholds
    riskThresholds: {
        low: parseInt(process.env.RISK_THRESHOLD_LOW || '30'),
        medium: parseInt(process.env.RISK_THRESHOLD_MEDIUM || '60'),
        high: parseInt(process.env.RISK_THRESHOLD_HIGH || '80'),
        veryHigh: parseInt(process.env.RISK_THRESHOLD_VERY_HIGH || '90'),
    },

    // Transaction Limits
    transactionLimits: {
        dailyLimit: parseFloat(process.env.DAILY_TRANSACTION_LIMIT || '50000'),
        monthlyLimit: parseFloat(process.env.MONTHLY_TRANSACTION_LIMIT || '500000'),
        singleTransactionLimit: parseFloat(process.env.SINGLE_TRANSACTION_LIMIT || '100000'),
        velocityThreshold: parseInt(process.env.VELOCITY_THRESHOLD || '20'), // transactions per day
        highValueThreshold: parseFloat(process.env.HIGH_VALUE_THRESHOLD || '10000'),
    },

    // Sanctions Lists
    sanctionsLists: {
        enabled: process.env.SANCTIONS_SCREENING_ENABLED === 'true',
        lists: (process.env.SANCTIONS_LISTS || 'OFAC,UN,EU,UK_HMT').split(','),
        updateInterval: parseInt(process.env.SANCTIONS_UPDATE_INTERVAL || '86400000'), // 24 hours in ms
        confidenceThreshold: parseFloat(process.env.SANCTIONS_CONFIDENCE_THRESHOLD || '0.8'),
    },

    // Cache Configuration
    cache: {
        addressRiskTTL: parseInt(process.env.ADDRESS_RISK_CACHE_TTL || '86400'), // 24 hours in seconds
        sanctionsCheckTTL: parseInt(process.env.SANCTIONS_CACHE_TTL || '3600'), // 1 hour in seconds
        kycStatusTTL: parseInt(process.env.KYC_STATUS_CACHE_TTL || '1800'), // 30 minutes in seconds
    },

    // Monitoring and Alerting
    monitoring: {
        alertWebhookUrl: process.env.COMPLIANCE_ALERT_WEBHOOK_URL || '',
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        emailAlerts: process.env.EMAIL_ALERTS_ENABLED === 'true',
        alertThresholds: {
            highRiskTransactions: parseInt(process.env.HIGH_RISK_ALERT_THRESHOLD || '5'),
            sanctionsMatches: parseInt(process.env.SANCTIONS_ALERT_THRESHOLD || '1'),
            failedKYCAttempts: parseInt(process.env.FAILED_KYC_ALERT_THRESHOLD || '10'),
        },
    },

    // Jurisdiction-Specific Rules
    jurisdictions: {
        us: {
            enabled: process.env.US_COMPLIANCE_ENABLED === 'true',
            kycRequired: true,
            transactionReporting: true,
            reportingThreshold: 10000,
            blockedStates: (process.env.US_BLOCKED_STATES || '').split(',').filter(Boolean),
        },
        eu: {
            enabled: process.env.EU_COMPLIANCE_ENABLED === 'true',
            kycRequired: true,
            transactionReporting: true,
            reportingThreshold: 1000,
            gdprCompliant: true,
            blockedCountries: (process.env.EU_BLOCKED_COUNTRIES || '').split(',').filter(Boolean),
        },
        uk: {
            enabled: process.env.UK_COMPLIANCE_ENABLED === 'true',
            kycRequired: true,
            transactionReporting: true,
            reportingThreshold: 1000,
            fca_regulated: true,
        },
        uae: {
            enabled: process.env.UAE_COMPLIANCE_ENABLED === 'true',
            kycRequired: true,
            transactionReporting: false,
            reportingThreshold: 50000,
            dmccCompliant: true,
        },
    },

    // Document Requirements
    documents: {
        acceptedTypes: (process.env.ACCEPTED_DOCUMENT_TYPES || 'passport,drivers_license,national_id').split(','),
        maxFileSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760'), // 10MB
        allowedFormats: (process.env.ALLOWED_DOCUMENT_FORMATS || 'jpg,jpeg,png,pdf').split(','),
        retentionPeriod: parseInt(process.env.DOCUMENT_RETENTION_PERIOD || '2555'), // 7 years in days
    },

    // Reporting Configuration
    reporting: {
        automaticReports: process.env.AUTOMATIC_REPORTS_ENABLED === 'true',
        reportSchedule: process.env.REPORT_SCHEDULE || '0 0 * * 0', // Weekly on Sunday
        reportRecipients: (process.env.REPORT_RECIPIENTS || '').split(',').filter(Boolean),
        reportTypes: (process.env.ENABLED_REPORT_TYPES || 'aml,kyc,sanctions,all').split(','),
        retentionPeriod: parseInt(process.env.REPORT_RETENTION_PERIOD || '2555'), // 7 years in days
    },

    // Feature Flags
    features: {
        realTimeScreening: process.env.REAL_TIME_SCREENING_ENABLED === 'true',
        behavioralAnalysis: process.env.BEHAVIORAL_ANALYSIS_ENABLED === 'true',
        mlRiskScoring: process.env.ML_RISK_SCORING_ENABLED === 'true',
        blockchainAnalysis: process.env.BLOCKCHAIN_ANALYSIS_ENABLED === 'true',
        crossChainTracking: process.env.CROSS_CHAIN_TRACKING_ENABLED === 'true',
    },
};

// Risk Level Mappings
export const RiskLevels = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    VERY_HIGH: 'VERY_HIGH',
} as const;

export type RiskLevel = typeof RiskLevels[keyof typeof RiskLevels];

// KYC Status Mappings
export const KYCStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
    MANUAL_REVIEW: 'MANUAL_REVIEW',
} as const;

export type KYCStatusType = typeof KYCStatus[keyof typeof KYCStatus];

// Document Types
export const DocumentTypes = {
    PASSPORT: 'PASSPORT',
    DRIVERS_LICENSE: 'DRIVERS_LICENSE',
    NATIONAL_ID: 'NATIONAL_ID',
    UTILITY_BILL: 'UTILITY_BILL',
    BANK_STATEMENT: 'BANK_STATEMENT',
} as const;

export type DocumentType = typeof DocumentTypes[keyof typeof DocumentTypes];

// Alert Types
export const AlertTypes = {
    HIGH_RISK_ADDRESS: 'HIGH_RISK_ADDRESS',
    HIGH_RISK_TRANSACTION: 'HIGH_RISK_TRANSACTION',
    SANCTIONS_MATCH: 'SANCTIONS_MATCH',
    PEP_MATCH: 'PEP_MATCH',
    VELOCITY_EXCEEDED: 'VELOCITY_EXCEEDED',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
    SUSPICIOUS_PATTERN: 'SUSPICIOUS_PATTERN',
    KYC_FAILED: 'KYC_FAILED',
    COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION',
} as const;

export type AlertType = typeof AlertTypes[keyof typeof AlertTypes];

// Compliance Actions
export const ComplianceActions = {
    ALLOW: 'ALLOW',
    BLOCK: 'BLOCK',
    REVIEW: 'REVIEW',
    MONITOR: 'MONITOR',
    ESCALATE: 'ESCALATE',
} as const;

export type ComplianceAction = typeof ComplianceActions[keyof typeof ComplianceActions];

// Validation Functions
export const validateComplianceConfig = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check required environment variables
    if (!ComplianceConfig.chainalysis.apiKey && process.env.NODE_ENV === 'production') {
        errors.push('CHAINALYSIS_API_KEY is required in production');
    }

    if (!ComplianceConfig.kyc.apiKey && process.env.NODE_ENV === 'production') {
        errors.push('KYC_API_KEY is required in production');
    }

    // Validate thresholds
    const { low, medium, high, veryHigh } = ComplianceConfig.riskThresholds;
    if (low >= medium || medium >= high || high >= veryHigh) {
        errors.push('Risk thresholds must be in ascending order: low < medium < high < veryHigh');
    }

    // Validate transaction limits
    const { dailyLimit, monthlyLimit, singleTransactionLimit } = ComplianceConfig.transactionLimits;
    if (singleTransactionLimit > dailyLimit || dailyLimit > monthlyLimit) {
        errors.push('Transaction limits must be logical: single <= daily <= monthly');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

// Helper Functions
export const getRiskLevelFromScore = (score: number): RiskLevel => {
    const { low, medium, high } = ComplianceConfig.riskThresholds;
    
    if (score >= high) return RiskLevels.VERY_HIGH;
    if (score >= medium) return RiskLevels.HIGH;
    if (score >= low) return RiskLevels.MEDIUM;
    return RiskLevels.LOW;
};

export const getComplianceActionFromRisk = (riskLevel: RiskLevel): ComplianceAction => {
    switch (riskLevel) {
        case RiskLevels.VERY_HIGH:
            return ComplianceActions.BLOCK;
        case RiskLevels.HIGH:
            return ComplianceActions.REVIEW;
        case RiskLevels.MEDIUM:
            return ComplianceActions.MONITOR;
        case RiskLevels.LOW:
        default:
            return ComplianceActions.ALLOW;
    }
};

export const isHighValueTransaction = (amount: number): boolean => {
    return amount >= ComplianceConfig.transactionLimits.highValueThreshold;
};

export const isJurisdictionEnabled = (jurisdiction: string): boolean => {
    const jurisdictionConfig = ComplianceConfig.jurisdictions[jurisdiction as keyof typeof ComplianceConfig.jurisdictions];
    return jurisdictionConfig?.enabled || false;
};

export default ComplianceConfig;