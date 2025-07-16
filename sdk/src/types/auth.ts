/**
 * Authentication-related types
 */

export interface LoginRequest {
  email?: string;
  walletAddress?: string;
  signature?: string;
  message?: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  walletAddress: string;
  signature: string;
  message: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface User {
  id: string;
  email: string;
  walletAddress: string;
  firstName?: string;
  lastName?: string;
  kycStatus: KYCStatus;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum KYCStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum UserRole {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN'
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiKeyResponse {
  apiKey: string;
  keyId: string;
  name: string;
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresAt?: string;
}