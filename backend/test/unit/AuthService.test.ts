import { AuthService } from '../../src/services/AuthService';
import { PrismaClient, User, UserRole, KYCStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/environment';
import { ErrorTypes } from '../../src/middleware/errorHandler';

// Mock PrismaClient
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  userPreferences: {
    create: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  apiKey: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock middleware functions
jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  verifyEthereumSignature: jest.fn().mockReturnValue(true),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  logSecurityEvent: jest.fn(),
  logBusinessEvent: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe('registerWithEmail', () => {
    it('should register a new user with email and password', async () => {
      // Mock user not existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
      
      // Mock user creation
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        kycStatus: KYCStatus.PENDING,
      } as User;
      mockPrismaClient.user.create.mockResolvedValueOnce(mockUser);
      
      // Mock user preferences creation
      mockPrismaClient.userPreferences.create.mockResolvedValueOnce({});

      const result = await authService.registerWithEmail(
        'test@example.com',
        'Password123!',
        'Test',
        'User'
      );

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
      expect(mockPrismaClient.userPreferences.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'mock-jwt-token',
      });
    });

    it('should throw an error if user already exists', async () => {
      // Mock user existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com',
      } as User);

      await expect(
        authService.registerWithEmail('test@example.com', 'Password123!', 'Test', 'User')
      ).rejects.toThrow('User with email test@example.com already exists');
    });

    it('should validate password strength', async () => {
      // Mock user not existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

      // Test weak password
      await expect(
        authService.registerWithEmail('test@example.com', 'weak', 'Test', 'User')
      ).rejects.toThrow('Password must be at least 8 characters long');

      // Test password without uppercase
      await expect(
        authService.registerWithEmail('test@example.com', 'password123!', 'Test', 'User')
      ).rejects.toThrow('Password must contain at least one uppercase letter');

      // Test password without lowercase
      await expect(
        authService.registerWithEmail('test@example.com', 'PASSWORD123!', 'Test', 'User')
      ).rejects.toThrow('Password must contain at least one lowercase letter');

      // Test password without number
      await expect(
        authService.registerWithEmail('test@example.com', 'Password!', 'Test', 'User')
      ).rejects.toThrow('Password must contain at least one number');

      // Test password without special character
      await expect(
        authService.registerWithEmail('test@example.com', 'Password123', 'Test', 'User')
      ).rejects.toThrow('Password must contain at least one special character');
    });
  });

  describe('registerWithWallet', () => {
    it('should register a new user with wallet address', async () => {
      // Mock wallet not existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
      
      // Mock user creation
      const mockUser = {
        id: 'user-123',
        walletAddress: '0x1234567890abcdef',
        email: 'test@example.com',
        role: UserRole.USER,
        kycStatus: KYCStatus.PENDING,
      } as User;
      mockPrismaClient.user.create.mockResolvedValueOnce(mockUser);
      
      // Mock user preferences creation
      mockPrismaClient.userPreferences.create.mockResolvedValueOnce({});

      const result = await authService.registerWithWallet(
        '0x1234567890abcdef',
        'signature',
        'message',
        'test@example.com'
      );

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress: '0x1234567890abcdef' },
      });
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
      expect(mockPrismaClient.userPreferences.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'mock-jwt-token',
      });
    });

    it('should throw an error if wallet already exists', async () => {
      // Mock wallet existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        walletAddress: '0x1234567890abcdef',
      } as User);

      await expect(
        authService.registerWithWallet('0x1234567890abcdef', 'signature', 'message')
      ).rejects.toThrow('User with wallet address 0x1234567890abcdef already exists');
    });

    it('should throw an error if email already exists', async () => {
      // Mock wallet not existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
      
      // Mock email existing
      mockPrismaClient.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com',
      } as User);

      await expect(
        authService.registerWithWallet('0x1234567890abcdef', 'signature', 'message', 'test@example.com')
      ).rejects.toThrow('User with email test@example.com already exists');
    });
  });

  describe('loginWithEmail', () => {
    it('should login a user with email and password', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        kycStatus: KYCStatus.APPROVED,
        isActive: true,
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);
      
      // Mock session creation
      mockPrismaClient.userSession.create.mockResolvedValueOnce({
        id: 'session-123',
        userId: 'user-123',
        sessionToken: 'session-token',
        refreshToken: 'refresh-token-hash',
      });
      
      // Mock user update
      mockPrismaClient.user.update.mockResolvedValueOnce(mockUser);

      const result = await authService.loginWithEmail(
        'test@example.com',
        'Password123!',
        'device-info',
        '127.0.0.1',
        'user-agent'
      );

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrismaClient.userSession.create).toHaveBeenCalled();
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: expect.any(String),
      });
    });

    it('should throw an error if user not found', async () => {
      // Mock user not found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.loginWithEmail('test@example.com', 'Password123!')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw an error if password is incorrect', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        isActive: true,
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        authService.loginWithEmail('test@example.com', 'WrongPassword123!')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw an error if user is inactive', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        isActive: false,
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        authService.loginWithEmail('test@example.com', 'Password123!')
      ).rejects.toThrow('User account is inactive');
    });
  });

  describe('loginWithWallet', () => {
    it('should login a user with wallet signature', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        walletAddress: '0x1234567890abcdef',
        email: 'test@example.com',
        role: UserRole.USER,
        kycStatus: KYCStatus.APPROVED,
        isActive: true,
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);
      
      // Mock session creation
      mockPrismaClient.userSession.create.mockResolvedValueOnce({
        id: 'session-123',
        userId: 'user-123',
        sessionToken: 'session-token',
        refreshToken: 'refresh-token-hash',
      });
      
      // Mock user update
      mockPrismaClient.user.update.mockResolvedValueOnce(mockUser);

      const result = await authService.loginWithWallet(
        '0x1234567890abcdef',
        'signature',
        'message',
        'device-info',
        '127.0.0.1',
        'user-agent'
      );

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress: '0x1234567890abcdef' },
      });
      expect(mockPrismaClient.userSession.create).toHaveBeenCalled();
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: expect.any(String),
      });
    });

    it('should throw an error if user not found', async () => {
      // Mock user not found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.loginWithWallet('0x1234567890abcdef', 'signature', 'message')
      ).rejects.toThrow('User not found with this wallet address');
    });

    it('should throw an error if user is inactive', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        walletAddress: '0x1234567890abcdef',
        isActive: false,
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        authService.loginWithWallet('0x1234567890abcdef', 'signature', 'message')
      ).rejects.toThrow('User account is inactive');
    });
  });

  describe('refreshToken', () => {
    it('should refresh authentication token', async () => {
      // Mock session
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        refreshToken: 'refresh-token-hash',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: UserRole.USER,
          kycStatus: KYCStatus.APPROVED,
        },
      };
      
      // Mock session found
      mockPrismaClient.userSession.findFirst.mockResolvedValueOnce(mockSession);
      
      // Mock session update
      mockPrismaClient.userSession.update.mockResolvedValueOnce({});

      const result = await authService.refreshToken('refresh-token');

      expect(mockPrismaClient.userSession.findFirst).toHaveBeenCalled();
      expect(mockPrismaClient.userSession.update).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'mock-jwt-token',
        refreshToken: expect.any(String),
      });
    });

    it('should throw an error if refresh token is invalid', async () => {
      // Mock session not found
      mockPrismaClient.userSession.findFirst.mockResolvedValueOnce(null);

      await expect(
        authService.refreshToken('invalid-refresh-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout user by invalidating session', async () => {
      // Mock session update
      mockPrismaClient.userSession.updateMany.mockResolvedValueOnce({ count: 1 });

      await authService.logout('user-123', 'session-token');

      expect(mockPrismaClient.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          sessionToken: 'session-token',
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should logout user by invalidating all sessions', async () => {
      // Mock session update
      mockPrismaClient.userSession.updateMany.mockResolvedValueOnce({ count: 2 });

      await authService.logout('user-123');

      expect(mockPrismaClient.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
        data: {
          isActive: false,
        },
      });
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      // Mock user update
      const mockUpdatedUser = {
        id: 'user-123',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        phoneNumber: '+1234567890',
      } as User;
      mockPrismaClient.user.update.mockResolvedValueOnce(mockUpdatedUser);

      const result = await authService.updateUserProfile('user-123', {
        firstName: 'Updated',
        lastName: 'User',
        email: 'updated@example.com',
        phoneNumber: '+1234567890',
      });

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          firstName: 'Updated',
          lastName: 'User',
          email: 'updated@example.com',
          phoneNumber: '+1234567890',
        },
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw an error if email is already in use', async () => {
      // Mock email check
      mockPrismaClient.user.findFirst.mockResolvedValueOnce({
        id: 'other-user',
        email: 'taken@example.com',
      } as User);

      await expect(
        authService.updateUserProfile('user-123', {
          email: 'taken@example.com',
        })
      ).rejects.toThrow('Email taken@example.com is already in use');
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        hashedPassword: await bcrypt.hash('CurrentPassword123!', 12),
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);
      
      // Mock user update
      mockPrismaClient.user.update.mockResolvedValueOnce({} as User);

      await authService.changePassword('user-123', 'CurrentPassword123!', 'NewPassword123!');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });

    it('should throw an error if user not found', async () => {
      // Mock user not found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.changePassword('user-123', 'CurrentPassword123!', 'NewPassword123!')
      ).rejects.toThrow('User not found or has no password');
    });

    it('should throw an error if current password is incorrect', async () => {
      // Mock user
      const mockUser = {
        id: 'user-123',
        hashedPassword: await bcrypt.hash('CurrentPassword123!', 12),
      } as User;
      
      // Mock user found
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        authService.changePassword('user-123', 'WrongPassword123!', 'NewPassword123!')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('registerMerchant', () => {
    it('should register a new merchant', async () => {
      // Mock merchant not existing
      mockPrismaClient.merchant.findUnique.mockResolvedValueOnce(null);
      
      // Mock merchant creation
      const mockMerchant = {
        id: 'merchant-123',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        website: 'https://example.com',
        description: 'Test merchant description',
        category: 'ecommerce',
        businessType: 'ONLINE',
      };
      mockPrismaClient.merchant.create.mockResolvedValueOnce(mockMerchant);
      
      // Mock API key creation
      mockPrismaClient.apiKey.create.mockResolvedValueOnce({});

      const result = await authService.registerMerchant(
        'Test Merchant',
        'merchant@example.com',
        'https://example.com',
        'Test merchant description',
        'ecommerce',
        'ONLINE',
        'user-123'
      );

      expect(mockPrismaClient.merchant.findUnique).toHaveBeenCalledWith({
        where: { email: 'merchant@example.com' },
      });
      expect(mockPrismaClient.merchant.create).toHaveBeenCalled();
      expect(mockPrismaClient.apiKey.create).toHaveBeenCalled();
      expect(result).toEqual({
        merchant: mockMerchant,
        apiKey: expect.any(String),
      });
    });

    it('should throw an error if merchant already exists', async () => {
      // Mock merchant existing
      mockPrismaClient.merchant.findUnique.mockResolvedValueOnce({
        id: 'existing-merchant',
        email: 'merchant@example.com',
      });

      await expect(
        authService.registerMerchant(
          'Test Merchant',
          'merchant@example.com',
          'https://example.com',
          'Test merchant description',
          'ecommerce',
          'ONLINE'
        )
      ).rejects.toThrow('Merchant with email merchant@example.com already exists');
    });
  });
});