/**
 * Compliance service usage examples for YieldRails SDK
 */

import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize SDK with configuration
const sdk = new YieldRailsSDK({
  apiUrl: process.env.YIELDRAILS_API_URL || 'https://api.yieldrails.com',
  apiKey: process.env.YIELDRAILS_API_KEY,
  timeout: 60000,
  debug: process.env.NODE_ENV === 'development',
});

async function complianceExamples() {
  try {
    // Authenticate first
    await sdk.auth.login({
      email: 'admin@example.com',
      password: 'secure-password',
    });

    console.log('=== Address Compliance Checks ===');
    
    // Check address compliance
    const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9';
    const addressCheck = await sdk.compliance.checkAddress(address);
    
    console.log(`Address ${address} compliance check:`, {
      isCompliant: addressCheck.isCompliant,
      riskLevel: addressCheck.riskLevel,
      riskScore: addressCheck.riskScore,
      sanctions: addressCheck.sanctions,
      pep: addressCheck.pep,
    });

    // Get detailed compliance status
    const complianceStatus = await sdk.compliance.getComplianceStatus(address);
    
    console.log(`Address ${address} detailed compliance status:`, {
      status: complianceStatus.status,
      kycStatus: complianceStatus.kycStatus,
      amlStatus: complianceStatus.amlStatus,
      restrictions: complianceStatus.restrictions,
      approvedCountries: complianceStatus.approvedCountries.length,
      blockedCountries: complianceStatus.blockedCountries.length,
    });

    console.log('\n=== KYC Document Verification ===');
    
    // Upload KYC document
    const documentUpload = {
      userId: 'user123',
      documentType: 'passport',
      documentBase64: 'base64-encoded-document-data',
      fileName: 'passport.jpg'
    };
    
    const uploadResult = await sdk.compliance.uploadDocument(documentUpload);
    
    console.log('Document uploaded:', {
      userId: uploadResult.userId,
      documentType: uploadResult.documentType,
      documentUrl: uploadResult.documentUrl,
      uploadedAt: uploadResult.uploadedAt,
    });

    // Submit KYC for verification
    const kycSubmission = {
      userId: 'user123',
      documentType: 'passport',
      documentNumber: 'AB123456',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      address: '123 Main St, City, Country',
      documentUrl: uploadResult.documentUrl,
    };
    
    const kycResult = await sdk.compliance.submitKYC(kycSubmission);
    
    console.log('KYC submitted:', {
      submissionId: kycResult.submissionId,
      status: kycResult.status,
      estimatedProcessingTime: kycResult.estimatedProcessingTime,
    });

    // Check KYC status
    const kycStatus = await sdk.compliance.getKYCStatus('user123');
    
    console.log('KYC status:', {
      status: kycStatus.status,
      verificationLevel: kycStatus.verificationLevel,
      documents: kycStatus.documents.length,
      limits: kycStatus.limits,
    });

    console.log('\n=== Transaction Compliance ===');
    
    // Verify transaction compliance
    const transaction = {
      transactionId: 'tx123',
      fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      toAddress: '0x9876543210987654321098765432109876543210',
      amount: 1000.5,
      currency: 'USD',
    };
    
    const transactionVerification = await sdk.compliance.verifyTransaction(transaction);
    
    console.log('Transaction verification:', {
      status: transactionVerification.status,
      riskScore: transactionVerification.riskScore,
      riskLevel: transactionVerification.riskLevel,
      amlCheck: transactionVerification.amlCheck,
      sanctionsCheck: transactionVerification.sanctionsCheck,
      pepCheck: transactionVerification.pepCheck,
      flags: transactionVerification.flags,
      recommendations: transactionVerification.recommendations,
    });

    // Assess risk for an address
    const riskAssessment = {
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      transactionCount: 5,
      totalVolume: 5000,
    };
    
    const riskResult = await sdk.compliance.assessRisk(riskAssessment);
    
    console.log('Risk assessment:', {
      baseRiskScore: riskResult.baseRiskScore,
      velocityRiskScore: riskResult.velocityRiskScore,
      volumeRiskScore: riskResult.volumeRiskScore,
      combinedRiskScore: riskResult.combinedRiskScore,
      riskLevel: riskResult.riskLevel,
      recommendations: riskResult.recommendations,
    });

    console.log('\n=== Sanctions Screening ===');
    
    // Check name against sanctions lists
    const sanctionsCheck = {
      name: 'John Smith',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
    };
    
    const sanctionsResult = await sdk.compliance.checkSanctions(sanctionsCheck);
    
    console.log('Sanctions check:', {
      isMatch: sanctionsResult.isMatch,
      confidence: sanctionsResult.confidence,
      matches: sanctionsResult.matches.length,
      status: sanctionsResult.status,
    });

    console.log('\n=== Compliance Reporting ===');
    
    // Generate compliance report (admin only)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    
    const report = await sdk.compliance.generateReport(startDate, endDate, 'all');
    
    console.log('Compliance report:', {
      reportId: report.reportId,
      type: report.type,
      period: report.period,
      summary: {
        totalTransactions: report.summary.totalTransactions,
        flaggedTransactions: report.summary.flaggedTransactions,
        approvedTransactions: report.summary.approvedTransactions,
        rejectedTransactions: report.summary.rejectedTransactions,
      },
      kycStats: report.kycStats,
      amlStats: report.amlStats,
      sanctionsStats: report.sanctionsStats,
    });

    // Check merchant compliance
    const merchantCompliance = await sdk.compliance.checkMerchant('merchant123');
    
    console.log('Merchant compliance:', {
      isCompliant: merchantCompliance.isCompliant,
      issues: merchantCompliance.issues,
      recommendations: merchantCompliance.recommendations,
    });

    console.log('\n=== Compliance Audit Trail ===');
    
    // Get compliance audit trail (admin only)
    const auditTrail = await sdk.compliance.getAuditTrail({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      userId: 'user123',
      action: 'KYC_APPROVED',
      limit: 10,
      offset: 0,
    });
    
    console.log('Audit trail:', {
      total: auditTrail.total,
      entries: auditTrail.entries.map(entry => ({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        createdAt: entry.createdAt,
      })),
    });

    console.log('\n=== Compliance Workflow Examples ===');
    
    // Example: Pre-transaction compliance check workflow
    async function preTransactionComplianceCheck(
      fromAddress: string,
      toAddress: string,
      amount: number,
      currency: string
    ) {
      console.log('Running pre-transaction compliance check...');
      
      // 1. Check both addresses
      const [fromAddressCheck, toAddressCheck] = await Promise.all([
        sdk.compliance.checkAddress(fromAddress),
        sdk.compliance.checkAddress(toAddress),
      ]);
      
      // 2. Verify transaction
      const transactionCheck = await sdk.compliance.verifyTransaction({
        transactionId: `pre-check-${Date.now()}`,
        fromAddress,
        toAddress,
        amount,
        currency,
      });
      
      // 3. Determine if transaction should proceed
      const shouldProceed = 
        fromAddressCheck.isCompliant && 
        toAddressCheck.isCompliant && 
        transactionCheck.status !== 'rejected';
      
      console.log('Pre-transaction compliance check result:', {
        shouldProceed,
        fromAddressRisk: fromAddressCheck.riskLevel,
        toAddressRisk: toAddressCheck.riskLevel,
        transactionRisk: transactionCheck.riskLevel,
        flags: transactionCheck.flags,
        recommendations: transactionCheck.recommendations,
      });
      
      return {
        shouldProceed,
        fromAddressCheck,
        toAddressCheck,
        transactionCheck,
      };
    }
    
    // Run the pre-transaction check
    await preTransactionComplianceCheck(
      '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
      '0x9876543210987654321098765432109876543210',
      5000,
      'USD'
    );

    // Example: KYC verification workflow
    async function completeKYCWorkflow(
      userId: string,
      documentType: string,
      documentBase64: string,
      documentName: string,
      userInfo: {
        documentNumber: string;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        address: string;
      }
    ) {
      console.log('Starting KYC workflow...');
      
      // 1. Upload document
      const uploadResult = await sdk.compliance.uploadDocument({
        userId,
        documentType,
        documentBase64,
        fileName: documentName,
      });
      
      console.log('Document uploaded:', uploadResult.documentUrl);
      
      // 2. Submit KYC with document URL
      const kycResult = await sdk.compliance.submitKYC({
        userId,
        documentType,
        documentNumber: userInfo.documentNumber,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        dateOfBirth: userInfo.dateOfBirth,
        address: userInfo.address,
        documentUrl: uploadResult.documentUrl,
      });
      
      console.log('KYC submitted:', {
        submissionId: kycResult.submissionId,
        status: kycResult.status,
      });
      
      // 3. If immediate approval/rejection, return result
      if (kycResult.status !== 'pending') {
        return {
          completed: true,
          status: kycResult.status,
          submissionId: kycResult.submissionId,
        };
      }
      
      // 4. For pending status, return info about checking later
      return {
        completed: false,
        status: 'pending',
        submissionId: kycResult.submissionId,
        estimatedProcessingTime: kycResult.estimatedProcessingTime,
        message: `KYC verification in progress. Estimated processing time: ${kycResult.estimatedProcessingTime}`,
      };
    }
    
    // Example KYC workflow (commented out to avoid actual API calls)
    /*
    const kycWorkflowResult = await completeKYCWorkflow(
      'user123',
      'passport',
      'base64-encoded-document-data',
      'passport.jpg',
      {
        documentNumber: 'AB123456',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        address: '123 Main St, City, Country',
      }
    );
    console.log('KYC workflow result:', kycWorkflowResult);
    */

  } catch (error) {
    console.error('Error in compliance examples:', error);
  }
}

// Run compliance examples
if (require.main === module) {
  complianceExamples().catch(console.error);
}

export { complianceExamples };