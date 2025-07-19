import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { logger } from '../../utils/logger';
import { config } from '../../config/environment';

/**
 * Interface for MoonPay transaction
 */
export interface MoonPayTransaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  baseCurrencyAmount: number;
  quoteCurrencyAmount: number;
  feeAmount: number;
  extraFeeAmount: number;
  networkFeeAmount: number;
  areFeesIncluded: boolean;
  status: string;
  failureReason: string | null;
  walletAddress: string;
  walletAddressTag: string | null;
  cryptoTransactionId: string | null;
  returnUrl: string | null;
  redirectUrl: string | null;
  widgetRedirectUrl: string | null;
  eurRate: number;
  usdRate: number;
  gbpRate: number;
  baseCurrency: {
    id: string;
    name: string;
    code: string;
    precision: number;
  };
  quoteCurrency: {
    id: string;
    name: string;
    code: string;
    precision: number;
  };
  customerId: string;
  cardId: string | null;
  bankAccountId: string | null;
  bankDepositInformation: any | null;
  bankTransferReference: string | null;
  externalTransactionId: string | null;
  externalCustomerId: string | null;
}

/**
 * Interface for MoonPay URL request
 */
export interface MoonPayUrlRequest {
  currencyCode: string;
  walletAddress: string;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: number;
  email?: string;
  showWalletAddressForm?: boolean;
  redirectURL?: string;
  externalCustomerId?: string;
  externalTransactionId?: string;
}

/**
 * Interface for MoonPay currency
 */
export interface MoonPayCurrency {
  id: string;
  name: string;
  code: string;
  precision: number;
  minAmount: number;
  maxAmount: number;
  type: 'crypto' | 'fiat';
  networks: {
    id: string;
    name: string;
    code: string;
  }[];
}

/**
 * MoonPay Service for fiat on-ramp integration
 */
export class MoonPayService {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private widgetUrl: string;

  /**
   * Initialize the MoonPay Service
   */
  constructor() {
    this.apiKey = process.env.MOONPAY_API_KEY || '';
    this.secretKey = process.env.MOONPAY_SECRET_KEY || '';
    this.baseUrl = process.env.MOONPAY_API_URL || 'https://api.moonpay.com';
    this.widgetUrl = process.env.MOONPAY_WIDGET_URL || 'https://buy.moonpay.com';

    // Create axios instance with default config
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.apiKey
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
   * Generate a signed MoonPay widget URL
   * @param request URL request parameters
   * @returns Signed MoonPay widget URL
   */
  public generateWidgetUrl(request: MoonPayUrlRequest): string {
    try {
      logger.info('Generating MoonPay widget URL', { 
        currencyCode: request.currencyCode,
        walletAddress: request.walletAddress
      });

      // Build URL parameters
      const params = new URLSearchParams();
      params.append('apiKey', this.apiKey);
      params.append('currencyCode', request.currencyCode);
      params.append('walletAddress', request.walletAddress);

      if (request.baseCurrencyCode) {
        params.append('baseCurrencyCode', request.baseCurrencyCode);
      }

      if (request.baseCurrencyAmount) {
        params.append('baseCurrencyAmount', request.baseCurrencyAmount.toString());
      }

      if (request.email) {
        params.append('email', request.email);
      }

      if (request.showWalletAddressForm !== undefined) {
        params.append('showWalletAddressForm', request.showWalletAddressForm.toString());
      }

      if (request.redirectURL) {
        params.append('redirectURL', request.redirectURL);
      }

      if (request.externalCustomerId) {
        params.append('externalCustomerId', request.externalCustomerId);
      }

      if (request.externalTransactionId) {
        params.append('externalTransactionId', request.externalTransactionId);
      }

      // Generate signature if secret key is available
      if (this.secretKey) {
        const signature = this.generateSignature(params.toString());
        params.append('signature', signature);
      } else {
        logger.warn('MoonPay secret key not configured, generating unsigned URL');
      }

      const url = `${this.widgetUrl}?${params.toString()}`;
      
      logger.info('MoonPay widget URL generated');
      
      return url;
    } catch (error) {
      logger.error('Failed to generate MoonPay widget URL', { error });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   * @param transactionId MoonPay transaction ID
   * @returns Transaction details
   */
  public async getTransaction(transactionId: string): Promise<MoonPayTransaction> {
    try {
      logger.info('Getting MoonPay transaction', { transactionId });

      const response = await this.apiClient.get(`/v1/transactions/${transactionId}`);
      
      logger.info('MoonPay transaction retrieved', { 
        transactionId,
        status: response.data.status
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get MoonPay transaction', { error, transactionId });
      throw error;
    }
  }

  /**
   * Get transactions by external customer ID
   * @param externalCustomerId External customer ID
   * @returns List of transactions
   */
  public async getTransactionsByCustomer(externalCustomerId: string): Promise<MoonPayTransaction[]> {
    try {
      logger.info('Getting MoonPay transactions by customer', { externalCustomerId });

      const response = await this.apiClient.get('/v1/transactions', {
        params: {
          externalCustomerId
        }
      });
      
      logger.info('MoonPay transactions retrieved', { 
        externalCustomerId,
        count: response.data.length
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get MoonPay transactions by customer', { error, externalCustomerId });
      throw error;
    }
  }

  /**
   * Get supported currencies
   * @param type Optional filter by currency type (crypto or fiat)
   * @returns List of supported currencies
   */
  public async getSupportedCurrencies(type?: 'crypto' | 'fiat'): Promise<MoonPayCurrency[]> {
    try {
      logger.info('Getting MoonPay supported currencies', { type });

      const params: any = {};
      if (type) {
        params.type = type;
      }

      const response = await this.apiClient.get('/v1/currencies', { params });
      
      logger.info('MoonPay supported currencies retrieved', { 
        count: response.data.length
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get MoonPay supported currencies', { error });
      throw error;
    }
  }

  /**
   * Get buy quote for a currency
   * @param baseCurrencyCode Base currency code (e.g., 'USD')
   * @param quoteCurrencyCode Quote currency code (e.g., 'USDC')
   * @param baseCurrencyAmount Amount in base currency
   * @returns Quote details
   */
  public async getBuyQuote(
    baseCurrencyCode: string,
    quoteCurrencyCode: string,
    baseCurrencyAmount: number
  ): Promise<any> {
    try {
      logger.info('Getting MoonPay buy quote', { 
        baseCurrencyCode,
        quoteCurrencyCode,
        baseCurrencyAmount
      });

      const response = await this.apiClient.get('/v3/currencies/quote', {
        params: {
          baseCurrencyCode,
          quoteCurrencyCode,
          baseCurrencyAmount,
          areFeesIncluded: true
        }
      });
      
      logger.info('MoonPay buy quote retrieved');
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get MoonPay buy quote', { error });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param payload Webhook payload
   * @param signature Signature from webhook header
   * @returns Whether the signature is valid
   */
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      if (!this.secretKey) {
        logger.warn('MoonPay secret key not configured, cannot verify webhook signature');
        return false;
      }

      const computedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('base64');

      return computedSignature === signature;
    } catch (error) {
      logger.error('Failed to verify MoonPay webhook signature', { error });
      return false;
    }
  }

  /**
   * Generate signature for URL
   * @param urlParams URL parameters as string
   * @returns Base64 signature
   */
  private generateSignature(urlParams: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(urlParams)
      .digest('base64');
  }

  /**
   * Handle API error
   * @param error Error from API call
   */
  private handleApiError(error: any): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error('MoonPay API error response', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('MoonPay API no response', {
        request: error.request
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('MoonPay API request error', {
        message: error.message
      });
    }
  }
}