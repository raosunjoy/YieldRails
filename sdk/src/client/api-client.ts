/**
 * Core API client for YieldRails SDK
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ErrorResponse, SDKConfig, YieldRailsError } from '../types/common';

export class ApiClient {
  private client: AxiosInstance;
  private config: SDKConfig;
  private accessToken?: string;

  constructor(config: SDKConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@yieldrails/sdk',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add API key if provided
        if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        }

        // Add access token if available
        if (this.accessToken) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        if (this.config.debug) {
          console.log(`[YieldRails SDK] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        if (this.config.debug) {
          console.log(`[YieldRails SDK] Response:`, response.data);
        }
        return response;
      },
      async (error) => {
        if (this.config.debug) {
          console.error(`[YieldRails SDK] Error:`, error.response?.data || error.message);
        }

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && this.accessToken) {
          // Token might be expired, clear it
          this.accessToken = undefined;
        }

        // Transform error to YieldRailsError
        if (error.response?.data) {
          // API error with response
          const errorResponse: ErrorResponse = error.response.data;
          throw new YieldRailsError(
            errorResponse.error,
            errorResponse.message,
            error.response.status,
            errorResponse.details
          );
        } else {
          // Network error or other error without response
          throw new YieldRailsError(
            'NETWORK_ERROR',
            error.message || 'Network request failed',
            error.response?.status || 500
          );
        }
      }
    );
  }

  public setAccessToken(token: string): void {
    this.accessToken = token;
  }

  public clearAccessToken(): void {
    this.accessToken = undefined;
  }

  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return this.handleResponse(response);
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return this.handleResponse(response);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return this.handleResponse(response);
  }

  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return this.handleResponse(response);
  }

  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { data } = response;
    
    if (!data.success) {
      throw new YieldRailsError(
        data.error || 'API_ERROR',
        data.message || data.error || 'API request failed',
        response.status
      );
    }

    return data.data as T;
  }

  public getConfig(): SDKConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update axios instance if needed
    if (updates.timeout) {
      this.client.defaults.timeout = updates.timeout;
    }
    
    if (updates.apiUrl) {
      this.client.defaults.baseURL = updates.apiUrl;
    }
  }
}