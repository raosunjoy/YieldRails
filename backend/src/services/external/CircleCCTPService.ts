import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { config } from '../../config/environment';

/**
 * Interface for CCTP transfer request
 */
export interface CCTPTransferRequest {
  sourceChain: string;
  destinationChain: string;
  amount: string;
  sourceAddress: string;
  destinationAddress: string;
  tokenSymbol: string;
  reference?: string;
}

/**
 * Interface for CCTP transfer response
 */
export interface CCTPTransferResponse {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  sourceChain: string;
  destinationChain: string;
  amount: string;
  fee: string;
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  attestation?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for CCTP transfer status
 */
export interface CCTPTransferStatus {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  attestation?: string;
  updatedAt: string;
}

/**
 * Circle Cross-Chain Transfer Protocol (CCTP) Service
 * Handles cross-chain USDC transfers using Circle's CCTP
 */
export class CircleCCTPService {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  /**
   * Initialize the Circle CCTP Service
   */
  constructor() {
    this.apiKey = config.CIRCLE_API_KEY || '';
    this.baseUrl = config.CIRCLE_API_URL || 'https://api.circle.com';

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
   * Initiate a cross-chain USDC transfer using Circle CCTP
   * @param request Transfer request details
   * @returns Transfer response with ID and status
   */
  public async initiateTransfer(request: CCTPTransferRequest): Promise<CCTPTransferResponse> {
    try {
      logger.info('Initiating Circle CCTP transfer', { 
        sourceChain: request.sourceChain,
        destinationChain: request.destinationChain,
        amount: request.amount
      });

      // Validate request
      this.validateTransferRequest(request);

      // Convert chain IDs to Circle format
      const sourceChainId = this.mapChainIdToCircleFormat(request.sourceChain);
      const destinationChainId = this.mapChainIdToCircleFormat(request.destinationChain);

      // Prepare request payload
      const payload = {
        source: {
          chain: sourceChainId,
          address: request.sourceAddress
        },
        destination: {
          chain: destinationChainId,
          address: request.destinationAddress
        },
        amount: request.amount,
        token: request.tokenSymbol || 'USDC',
        reference: request.reference || `transfer_${Date.now()}`
      };

      // Make API request
      const response = await this.apiClient.post('/v1/transfers', payload);
      
      // Format and return response
      const transferResponse: CCTPTransferResponse = {
        id: response.data.id,
        status: response.data.status,
        sourceChain: request.sourceChain,
        destinationChain: request.destinationChain,
        amount: request.amount,
        fee: response.data.fee || '0',
        sourceTransactionHash: response.data.sourceTransactionHash,
        destinationTransactionHash: response.data.destinationTransactionHash,
        attestation: response.data.attestation,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt
      };

      logger.info('Circle CCTP transfer initiated', { 
        transferId: transferResponse.id,
        status: transferResponse.status
      });

      return transferResponse;
    } catch (error) {
      logger.error('Failed to initiate Circle CCTP transfer', { error });
      throw error;
    }
  }

  /**
   * Get the status of a CCTP transfer
   * @param transferId The ID of the transfer
   * @returns Current status of the transfer
   */
  public async getTransferStatus(transferId: string): Promise<CCTPTransferStatus> {
    try {
      logger.info('Getting Circle CCTP transfer status', { transferId });

      const response = await this.apiClient.get(`/v1/transfers/${transferId}`);
      
      return {
        id: response.data.id,
        status: response.data.status,
        sourceTransactionHash: response.data.sourceTransactionHash,
        destinationTransactionHash: response.data.destinationTransactionHash,
        attestation: response.data.attestation,
        updatedAt: response.data.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get Circle CCTP transfer status', { error, transferId });
      throw error;
    }
  }

  /**
   * Get attestation for a completed transfer
   * @param transferId The ID of the transfer
   * @returns Attestation data for the transfer
   */
  public async getTransferAttestation(transferId: string): Promise<string> {
    try {
      logger.info('Getting Circle CCTP transfer attestation', { transferId });

      const status = await this.getTransferStatus(transferId);
      
      if (status.status !== 'complete') {
        throw new Error(`Transfer ${transferId} is not complete. Current status: ${status.status}`);
      }

      if (!status.attestation) {
        throw new Error(`No attestation available for transfer ${transferId}`);
      }

      return status.attestation;
    } catch (error) {
      logger.error('Failed to get Circle CCTP transfer attestation', { error, transferId });
      throw error;
    }
  }

  /**
   * Get supported chains for CCTP transfers
   * @returns List of supported chains
   */
  public async getSupportedChains(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/v1/supported-chains');
      return response.data.chains || [];
    } catch (error) {
      logger.error('Failed to get Circle CCTP supported chains', { error });
      throw error;
    }
  }

  /**
   * Get fee estimate for a CCTP transfer
   * @param sourceChain Source chain ID
   * @param destinationChain Destination chain ID
   * @param amount Amount to transfer
   * @returns Estimated fee for the transfer
   */
  public async estimateTransferFee(
    sourceChain: string,
    destinationChain: string,
    amount: string
  ): Promise<string> {
    try {
      logger.info('Estimating Circle CCTP transfer fee', { 
        sourceChain,
        destinationChain,
        amount
      });

      // Convert chain IDs to Circle format
      const sourceChainId = this.mapChainIdToCircleFormat(sourceChain);
      const destinationChainId = this.mapChainIdToCircleFormat(destinationChain);

      const response = await this.apiClient.get('/v1/fee-estimate', {
        params: {
          sourceChain: sourceChainId,
          destinationChain: destinationChainId,
          amount
        }
      });

      return response.data.fee || '0';
    } catch (error) {
      logger.error('Failed to estimate Circle CCTP transfer fee', { error });
      throw error;
    }
  }

  /**
   * Validate a transfer request
   * @param request Transfer request to validate
   */
  private validateTransferRequest(request: CCTPTransferRequest): void {
    if (!request.sourceChain) {
      throw new Error('Source chain is required');
    }

    if (!request.destinationChain) {
      throw new Error('Destination chain is required');
    }

    if (!request.amount || isNaN(Number(request.amount)) || Number(request.amount) <= 0) {
      throw new Error('Valid amount is required');
    }

    if (!request.sourceAddress || !ethers.utils.isAddress(request.sourceAddress)) {
      throw new Error('Valid source address is required');
    }

    if (!request.destinationAddress || !ethers.utils.isAddress(request.destinationAddress)) {
      throw new Error('Valid destination address is required');
    }

    if (!request.tokenSymbol) {
      throw new Error('Token symbol is required');
    }
  }

  /**
   * Map chain ID to Circle format
   * @param chainId Chain ID to map
   * @returns Circle format chain ID
   */
  private mapChainIdToCircleFormat(chainId: string): string {
    const chainMap: Record<string, string> = {
      '1': 'ethereum',
      '137': 'polygon',
      '42161': 'arbitrum',
      '8453': 'base',
      '11155111': 'ethereum-sepolia',
      '80001': 'polygon-mumbai',
      '421614': 'arbitrum-sepolia'
    };

    return chainMap[chainId] || chainId;
  }

  /**
   * Handle API error
   * @param error Error from API call
   */
  private handleApiError(error: any): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error('Circle API error response', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('Circle API no response', {
        request: error.request
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('Circle API request error', {
        message: error.message
      });
    }
  }
}