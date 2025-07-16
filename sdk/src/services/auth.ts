/**
 * Authentication service for YieldRails SDK
 */

import { ApiClient } from '../client/api-client';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  User,
  ApiKeyResponse,
  CreateApiKeyRequest,
} from '../types/auth';

export class AuthService {
  private apiClient: ApiClient;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Login with email/password or wallet signature
   */
  public async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/api/auth/login', request);
    
    // Store tokens
    this.apiClient.setAccessToken(response.accessToken);
    this.refreshToken = response.refreshToken;
    this.tokenExpiresAt = Date.now() + (response.expiresIn * 1000);
    
    return response;
  }

  /**
   * Register a new user
   */
  public async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/api/auth/register', request);
    
    // Store tokens
    this.apiClient.setAccessToken(response.accessToken);
    this.refreshToken = response.refreshToken;
    this.tokenExpiresAt = Date.now() + (response.expiresIn * 1000);
    
    return response;
  }

  /**
   * Refresh access token
   */
  public async refreshAccessToken(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const request: RefreshTokenRequest = {
      refreshToken: this.refreshToken,
    };

    const response = await this.apiClient.post<AuthResponse>('/api/auth/refresh', request);
    
    // Update tokens
    this.apiClient.setAccessToken(response.accessToken);
    this.refreshToken = response.refreshToken;
    this.tokenExpiresAt = Date.now() + (response.expiresIn * 1000);
    
    return response;
  }

  /**
   * Logout and clear tokens
   */
  public async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.apiClient.post('/api/auth/logout', {
          refreshToken: this.refreshToken,
        });
      }
    } catch (error) {
      // Ignore API errors during logout - we still want to clear tokens
      console.warn('Logout API call failed, but clearing tokens anyway:', error);
    } finally {
      // Clear tokens regardless of API call success
      this.clearTokens();
    }
  }

  /**
   * Get current user profile
   */
  public async getCurrentUser(): Promise<User> {
    return this.apiClient.get<User>('/api/auth/me');
  }

  /**
   * Update user profile
   */
  public async updateProfile(updates: Partial<User>): Promise<User> {
    return this.apiClient.put<User>('/api/auth/profile', updates);
  }

  /**
   * Create API key for programmatic access
   */
  public async createApiKey(request: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    return this.apiClient.post<ApiKeyResponse>('/api/auth/api-keys', request);
  }

  /**
   * List user's API keys
   */
  public async listApiKeys(): Promise<ApiKeyResponse[]> {
    return this.apiClient.get<ApiKeyResponse[]>('/api/auth/api-keys');
  }

  /**
   * Revoke an API key
   */
  public async revokeApiKey(keyId: string): Promise<void> {
    await this.apiClient.delete(`/api/auth/api-keys/${keyId}`);
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.tokenExpiresAt && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Check if token needs refresh
   */
  public needsRefresh(): boolean {
    if (!this.tokenExpiresAt) return false;
    
    // Refresh if token expires in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() > (this.tokenExpiresAt - fiveMinutes);
  }

  /**
   * Auto-refresh token if needed
   */
  public async ensureValidToken(): Promise<void> {
    if (this.needsRefresh() && this.refreshToken) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Clear stored tokens
   */
  public clearTokens(): void {
    this.apiClient.clearAccessToken();
    this.refreshToken = undefined;
    this.tokenExpiresAt = undefined;
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiresAt(): number | undefined {
    return this.tokenExpiresAt;
  }

  /**
   * Set tokens manually (for session restoration)
   */
  public setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.apiClient.setAccessToken(accessToken);
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
  }
}