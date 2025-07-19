import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { config } from '../../config/environment';

/**
 * Interface for address risk assessment
 */
export interface AddressRiskAssessment {
  address: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  sanctions: boolean;
  pep: boolean;
  amlFlags: string[];
  category?: string;
  source: string;
  lastChecked: Date;
}

/**
 * Interface for transaction risk assessment
 */
export interface TransactionRiskAssessment {
  transactionId: string;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  currency: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  flags: string[];
  recommendations: string[];
  timestamp: Date;
}

/**
 * Interface for sanctions check result
 */
export interface SanctionsCheckResult {
  name: string;
  address?: string;
  isMatch: boolean;
  matches: any[];
  confidence: number;
  timestamp: Date;
}

/**
 * Chainalysis Service for AML/KYC compliance checks
 */
export class ChainalysisService {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  /**
   * Initialize the Chainalysis Service
   */
  constructor() {
    this.apiKey = config.CHAINALYSIS_API_KEY || '';
    this.baseUrl = config.CHAINALYSIS_API_URL || 'https://api.chainalysis.com';

    // Create axios instance with default config
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      response => response,
      error => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check address risk using Chainalysis API
   * @param address Blockchain address to check
   * @returns Risk assessment for the address
   */
  public async checkAddressRisk(address: string): Promise<AddressRiskAssessment> {
    try {
      logger.info('Checking address risk with Chainalysis', { address });

      if (!this.apiKey) {
        logger.warn('Chainalysis API key not configured, using mock data');
        return this.getMockAddressRisk(address);
      }

      const response = await this.apiClient.get(`/v1/address/${address}`);
      
      // Process and normalize the response
      const riskScore = this.calculateAddressRiskScore(response.data);
      const riskLevel = this.determineRiskLevel(riskScore);

      const assessment: AddressRiskAssessment = {
        address,
        riskScore,
        riskLevel,
        sanctions: response.data.sanctions || false,
        pep: response.data.pep || false,
        amlFlags: response.data.flags || [],
        category: response.data.category,
        source: 'chainalysis',
        lastChecked: new Date()
      };

      logger.info('Address risk check completed', { 
        address, 
        riskScore, 
        riskLevel 
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to check address risk with Chainalysis', { error, address });
      
      // Fallback to mock data on error
      return this.getMockAddressRisk(address);
    }
  }

  /**
   * Check transaction risk using Chainalysis API
   * @param transaction Transaction details to check
   * @returns Risk assessment for the transaction
   */
  public async checkTransactionRisk(transaction: {
    transactionId: string;
    sourceAddress: string;
    destinationAddress: string;
    amount: string;
    currency: string;
  }): Promise<TransactionRiskAssessment> {
    try {
      logger.info('Checking transaction risk with Chainalysis', { 
        transactionId: transaction.transactionId 
      });

      if (!this.apiKey) {
        logger.warn('Chainalysis API key not configured, using mock data');
        return this.getMockTransactionRisk(transaction);
      }

      // Get risk assessments for both addresses
      const [sourceRisk, destinationRisk] = await Promise.all([
        this.checkAddressRisk(transaction.sourceAddress),
        this.checkAddressRisk(transaction.destinationAddress)
      ]);

      // Calculate transaction-specific risk factors
      const amountRisk = this.calculateAmountRisk(transaction.amount, transaction.currency);
      const patternRisk = this.calculatePatternRisk(transaction);

      // Combine all risk factors
      const combinedRiskScore = this.combineRiskScores([
        sourceRisk.riskScore,
        destinationRisk.riskScore,
        amountRisk,
        patternRisk
      ]);

      const riskLevel = this.determineRiskLevel(combinedRiskScore);
      const flags = this.generateRiskFlags(sourceRisk, destinationRisk, amountRisk, patternRisk);
      const recommendations = this.generateRecommendations(riskLevel, flags);

      const assessment: TransactionRiskAssessment = {
        transactionId: transaction.transactionId,
        sourceAddress: transaction.sourceAddress,
        destinationAddress: transaction.destinationAddress,
        amount: transaction.amount,
        currency: transaction.currency,
        riskScore: combinedRiskScore,
        riskLevel,
        flags,
        recommendations,
        timestamp: new Date()
      };

      logger.info('Transaction risk check completed', { 
        transactionId: transaction.transactionId, 
        riskScore: combinedRiskScore, 
        riskLevel 
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to check transaction risk with Chainalysis', { 
        error, 
        transactionId: transaction.transactionId 
      });
      
      // Fallback to mock data on error
      return this.getMockTransactionRisk(transaction);
    }
  }

  /**
   * Check sanctions list for individuals and entities
   * @param name Name to check against sanctions lists
   * @param address Optional blockchain address
   * @returns Sanctions check result
   */
  public async checkSanctionsList(name: string, address?: string): Promise<SanctionsCheckResult> {
    try {
      logger.info('Checking sanctions list with Chainalysis', { name, address });

      if (!this.apiKey) {
        logger.warn('Chainalysis API key not configured, using mock data');
        return this.getMockSanctionsCheck(name, address);
      }

      const payload = {
        name,
        address
      };

      const response = await this.apiClient.post('/v1/sanctions-screening', payload);
      
      const result: SanctionsCheckResult = {
        name,
        address,
        isMatch: response.data.isMatch || false,
        matches: response.data.matches || [],
        confidence: response.data.confidence || 0,
        timestamp: new Date()
      };

      logger.info('Sanctions check completed', { 
        name, 
        isMatch: result.isMatch, 
        confidence: result.confidence 
      });

      return result;
    } catch (error) {
      logger.error('Failed to check sanctions list with Chainalysis', { error, name });
      
      // Fallback to mock data on error
      return this.getMockSanctionsCheck(name, address);
    }
  }

  /**
   * Get supported currencies for Chainalysis API
   * @returns List of supported currencies
   */
  public async getSupportedCurrencies(): Promise<string[]> {
    try {
      const response = await this.apiClient.get('/v1/supported-currencies');
      return response.data.currencies || [];
    } catch (error) {
      logger.error('Failed to get Chainalysis supported currencies', { error });
      
      // Return common cryptocurrencies as fallback
      return ['BTC', 'ETH', 'USDC', 'USDT', 'DAI'];
    }
  }

  /**
   * Generate a mock address risk assessment for testing
   * @param address Blockchain address
   * @returns Mock risk assessment
   */
  private getMockAddressRisk(address: string): AddressRiskAssessment {
    // Generate deterministic mock data based on address
    const hash = address.slice(-4);
    const riskScore = parseInt(hash, 16) % 100;
    const riskLevel = this.determineRiskLevel(riskScore);
    
    return {
      address,
      riskScore,
      riskLevel,
      sanctions: riskScore > 90,
      pep: riskScore > 85,
      amlFlags: riskScore > 70 ? ['HIGH_VOLUME', 'MULTIPLE_EXCHANGES'] : [],
      category: riskScore > 80 ? 'exchange' : 'wallet',
      source: 'mock',
      lastChecked: new Date()
    };
  }

  /**
   * Generate a mock transaction risk assessment for testing
   * @param transaction Transaction details
   * @returns Mock transaction risk assessment
   */
  private getMockTransactionRisk(transaction: any): TransactionRiskAssessment {
    // Generate deterministic mock data based on transaction ID
    const hash = transaction.transactionId.slice(-4);
    const riskScore = parseInt(hash, 16) % 100;
    const riskLevel = this.determineRiskLevel(riskScore);
    
    const flags = [];
    if (riskScore > 80) flags.push('HIGH_RISK_ADDRESS');
    if (riskScore > 70) flags.push('SUSPICIOUS_PATTERN');
    if (riskScore > 60) flags.push('HIGH_VALUE_TRANSACTION');
    
    const recommendations = [];
    if (riskLevel === 'VERY_HIGH') {
      recommendations.push('Block transaction and conduct manual review');
    } else if (riskLevel === 'HIGH') {
      recommendations.push('Require additional verification');
    }
    
    return {
      transactionId: transaction.transactionId,
      sourceAddress: transaction.sourceAddress,
      destinationAddress: transaction.destinationAddress,
      amount: transaction.amount,
      currency: transaction.currency,
      riskScore,
      riskLevel,
      flags,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Generate a mock sanctions check result for testing
   * @param name Name to check
   * @param address Optional blockchain address
   * @returns Mock sanctions check result
   */
  private getMockSanctionsCheck(name: string, address?: string): SanctionsCheckResult {
    // Simple name matching for mock data
    const suspiciousNames = ['John Doe', 'Jane Smith', 'Bad Actor'];
    const isMatch = suspiciousNames.includes(name);
    const confidence = isMatch ? 0.95 : 0.0;
    
    const matches = isMatch ? [
      {
        name,
        listName: 'OFAC',
        confidence,
        matchType: 'name',
        details: `Match found in OFAC sanctions list`
      }
    ] : [];
    
    return {
      name,
      address,
      isMatch,
      matches,
      confidence,
      timestamp: new Date()
    };
  }

  /**
   * Calculate risk score for an address based on Chainalysis data
   * @param chainalysisData Data from Chainalysis API
   * @returns Risk score (0-100)
   */
  private calculateAddressRiskScore(chainalysisData: any): number {
    let score = chainalysisData.riskScore || 0;
    
    // Adjust based on flags
    if (chainalysisData.sanctions) score += 50;
    if (chainalysisData.pep) score += 30;
    if (chainalysisData.flags?.includes('MIXER')) score += 40;
    if (chainalysisData.flags?.includes('DARKNET')) score += 60;
    
    return Math.min(score, 100);
  }

  /**
   * Determine risk level based on risk score
   * @param score Risk score (0-100)
   * @returns Risk level
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    if (score >= 80) return 'VERY_HIGH';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate risk based on transaction amount
   * @param amount Transaction amount
   * @param currency Currency of the transaction
   * @returns Risk score (0-100)
   */
  private calculateAmountRisk(amount: string, currency: string): number {
    // Risk increases with amount
    const numAmount = Number(amount);
    const usdAmount = currency === 'USD' || currency === 'USDC' || currency === 'USDT' 
      ? numAmount 
      : numAmount * 1.0; // Simplified conversion
    
    if (usdAmount > 100000) return 80;
    if (usdAmount > 50000) return 60;
    if (usdAmount > 10000) return 40;
    if (usdAmount > 1000) return 20;
    return 10;
  }

  /**
   * Calculate risk based on transaction patterns
   * @param transaction Transaction details
   * @returns Risk score (0-100)
   */
  private calculatePatternRisk(transaction: any): number {
    // Simple pattern risk calculation for mock implementation
    let risk = 0;
    
    // Round number amounts are suspicious
    if (Number(transaction.amount) % 1000 === 0) risk += 20;
    
    // High value transactions
    if (Number(transaction.amount) > 50000) risk += 30;
    
    return Math.min(risk, 100);
  }

  /**
   * Combine multiple risk scores into a single score
   * @param scores Array of risk scores
   * @returns Combined risk score (0-100)
   */
  private combineRiskScores(scores: number[]): number {
    // Weighted average with emphasis on highest scores
    const sortedScores = scores.sort((a, b) => b - a);
    const weights = [0.4, 0.3, 0.2, 0.1]; // Decreasing weights
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < Math.min(scores.length, weights.length); i++) {
      weightedSum += sortedScores[i] * weights[i];
      totalWeight += weights[i];
    }
    
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Generate risk flags based on risk assessments
   * @param sourceRisk Source address risk
   * @param destRisk Destination address risk
   * @param amountRisk Amount risk
   * @param patternRisk Pattern risk
   * @returns Array of risk flags
   */
  private generateRiskFlags(
    sourceRisk: AddressRiskAssessment, 
    destRisk: AddressRiskAssessment, 
    amountRisk: number, 
    patternRisk: number
  ): string[] {
    const flags: string[] = [];
    
    if (sourceRisk.sanctions || destRisk.sanctions) flags.push('SANCTIONS_MATCH');
    if (sourceRisk.pep || destRisk.pep) flags.push('PEP_INVOLVED');
    if (sourceRisk.riskLevel === 'VERY_HIGH' || destRisk.riskLevel === 'VERY_HIGH') flags.push('HIGH_RISK_ADDRESS');
    if (amountRisk > 60) flags.push('HIGH_VALUE_TRANSACTION');
    if (patternRisk > 40) flags.push('SUSPICIOUS_PATTERN');
    
    return flags;
  }

  /**
   * Generate recommendations based on risk level and flags
   * @param riskLevel Risk level
   * @param flags Risk flags
   * @returns Array of recommendations
   */
  private generateRecommendations(riskLevel: string, flags: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'VERY_HIGH') {
      recommendations.push('Block transaction and conduct manual review');
      recommendations.push('Escalate to compliance team');
    } else if (riskLevel === 'HIGH') {
      recommendations.push('Require additional verification');
      recommendations.push('Monitor closely');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('Enhanced monitoring');
    }
    
    if (flags.includes('SANCTIONS_MATCH')) {
      recommendations.push('Verify against sanctions lists');
    }
    
    if (flags.includes('HIGH_VALUE_TRANSACTION')) {
      recommendations.push('Verify source of funds');
    }
    
    return recommendations;
  }

  /**
   * Handle API error
   * @param error Error from API call
   */
  private handleApiError(error: any): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error('Chainalysis API error response', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('Chainalysis API no response', {
        request: error.request
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('Chainalysis API request error', {
        message: error.message
      });
    }
  }
}