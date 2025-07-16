/**
 * Tests for AuthService
 */

import { AuthService } from '../auth';
import { ApiClient } from '../../client/api-client';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  KYCStatus,
  UserRole,
} from '../../types/auth';

// Mock ApiClient
jest.mock('../../client/api-client');
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockApiClient: jest.Mocked<ApiClient>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    walletAddress: '0x123...abc',
    firstName: 'John',
    lastName: 'Doe',
    kycStatus: KYCStatus.APPROVED,
    role: UserRole.USER,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    expiresIn: 3600,
    user: mockUser,
  };

  beforeEach(() => {
    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      setAccessToken: jest.fn(),
      clearAccessToken: jest.fn(),
    } as any;

    MockedApiClient.mockImplementation(() => mockApiClient);
    authService = new AuthService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login with email and password', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockApiClient.post.mockResolvedValue(mockAuthResponse);

      const result = await authService.login(loginRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/login', loginRequest);
      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('access-token-123');
      expect(result).toEqual(mockAuthResponse);
    });

    it('should login with wallet signature', async () => {
      const loginRequest: LoginRequest = {
        walletAddress: '0x123...abc',
        signature: 'signature-123',
        message: 'Sign this message',
      };

      mockApiClient.post.mockResolvedValue(mockAuthResponse);

      const result = await authService.login(loginRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/login', loginRequest);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should store tokens after successful login', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockApiClient.post.mockResolvedValue(mockAuthResponse);

      await authService.login(loginRequest);

      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('access-token-123');
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        walletAddress: '0x456...def',
        signature: 'signature-456',
        message: 'Register message',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockApiClient.post.mockResolvedValue(mockAuthResponse);

      const result = await authService.register(registerRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/register', registerRequest);
      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('access-token-123');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      // Set up initial login
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      // Mock refresh response
      const refreshResponse: AuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockApiClient.post.mockResolvedValue(refreshResponse);

      const result = await authService.refreshAccessToken();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/refresh', {
        refreshToken: 'refresh-token-123',
      });
      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('new-access-token');
      expect(result).toEqual(refreshResponse);
    });

    it('should throw error if no refresh token available', async () => {
      await expect(authService.refreshAccessToken()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('logout', () => {
    it('should logout and clear tokens', async () => {
      // Set up initial login
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      mockApiClient.post.mockResolvedValue(undefined);

      await authService.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/logout', {
        refreshToken: 'refresh-token-123',
      });
      expect(mockApiClient.clearAccessToken).toHaveBeenCalled();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should clear tokens even if API call fails', async () => {
      // Set up initial login
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      // Mock API failure
      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      await authService.logout();

      expect(mockApiClient.clearAccessToken).toHaveBeenCalled();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user profile', async () => {
      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = { ...mockUser, ...updates };
      mockApiClient.put.mockResolvedValue(updatedUser);

      const result = await authService.updateProfile(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/auth/profile', updates);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('API key management', () => {
    it('should create API key', async () => {
      const createRequest = {
        name: 'Test API Key',
        permissions: ['payments:read', 'payments:write'],
      };

      const apiKeyResponse = {
        apiKey: 'api-key-123',
        keyId: 'key-123',
        name: 'Test API Key',
        permissions: ['payments:read', 'payments:write'],
        createdAt: '2023-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(apiKeyResponse);

      const result = await authService.createApiKey(createRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/api-keys', createRequest);
      expect(result).toEqual(apiKeyResponse);
    });

    it('should list API keys', async () => {
      const apiKeys = [
        {
          apiKey: 'api-key-123',
          keyId: 'key-123',
          name: 'Test API Key',
          permissions: ['payments:read'],
          createdAt: '2023-01-01T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(apiKeys);

      const result = await authService.listApiKeys();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/api-keys');
      expect(result).toEqual(apiKeys);
    });

    it('should revoke API key', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await authService.revokeApiKey('key-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/auth/api-keys/key-123');
    });
  });

  describe('authentication state', () => {
    it('should return false for isAuthenticated when not logged in', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true for isAuthenticated when logged in', async () => {
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should detect when token needs refresh', async () => {
      // Mock a response with short expiration
      const shortExpiryResponse = {
        ...mockAuthResponse,
        expiresIn: 60, // 1 minute
      };

      mockApiClient.post.mockResolvedValue(shortExpiryResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      // Fast forward time to make token need refresh
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 4 * 60 * 1000); // 4 minutes later

      expect(authService.needsRefresh()).toBe(true);
    });

    it('should auto-refresh token when needed', async () => {
      // Initial login
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      // Mock refresh response
      const refreshResponse = {
        ...mockAuthResponse,
        accessToken: 'new-token',
      };

      mockApiClient.post.mockResolvedValue(refreshResponse);

      // Mock needsRefresh to return true
      jest.spyOn(authService, 'needsRefresh').mockReturnValue(true);

      await authService.ensureValidToken();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/refresh', {
        refreshToken: 'refresh-token-123',
      });
    });
  });

  describe('token management', () => {
    it('should set tokens manually', () => {
      authService.setTokens('manual-token', 'manual-refresh', 7200);

      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('manual-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should clear tokens', () => {
      authService.setTokens('token', 'refresh', 3600);
      authService.clearTokens();

      expect(mockApiClient.clearAccessToken).toHaveBeenCalled();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return token expiration time', async () => {
      mockApiClient.post.mockResolvedValue(mockAuthResponse);
      await authService.login({ email: 'test@example.com', password: 'password123' });

      const expiresAt = authService.getTokenExpiresAt();
      expect(expiresAt).toBeDefined();
      expect(typeof expiresAt).toBe('number');
    });
  });
});