export interface BiometricAuthConfig {
  enabled: boolean;
  type: 'fingerprint' | 'face' | 'iris' | 'voice' | 'none';
  fallbackToPin: boolean;
  promptTitle: string;
  promptSubtitle: string;
  promptDescription: string;
  cancelText: string;
  fallbackText: string;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  user: User | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: string | null;
  pinEnabled: boolean;
  sessionExpiry: number | null;
  authMethod: 'pin' | 'biometric' | 'password' | null;
  loading: boolean;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  walletAddress?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  profileComplete: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
}

export interface BiometricLoginRequest {
  userId: string;
  signature: string;
  deviceId: string;
}

export interface PinAuthRequest {
  pin: string;
  deviceId: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryType: 'TouchID' | 'FaceID' | 'Fingerprint' | 'None';
  isEnrolled: boolean;
  supportedTypes: string[];
}

export interface SecuritySettings {
  biometricAuth: boolean;
  pinAuth: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number; // in seconds
  requireAuthForTransactions: boolean;
  requireAuthForSensitiveData: boolean;
  sessionTimeout: number; // in seconds
}