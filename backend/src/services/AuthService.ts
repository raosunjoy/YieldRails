import { PrismaClient, User, UserSession, KYCStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';
import { ErrorTypes } from '../middleware/errorHandler';
import { AuthenticatedUser, generateToken, verifyEthereumSignature } from '../middleware/auth';
import { logger, logSecurityEvent, logBusinessEvent } from '../utils/logger';

/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
export class AuthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Register a new user with email and password
   */
  async registerWithEmail(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ErrorTypes.CONFLICT(`User with email ${email} already exists`);
    }

    // Validate password strength
    this.validatePasswordStrength(password);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName,
        lastName,
        role: UserRole.USER,
        kycStatus: KYCStatus.PENDING,
      },
    });

    // Create user preferences
    await this.prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    });

    // Generate authentication token
    const authUser: AuthenticatedUser = {
      id: user.id,
      address: '',
      role: user.role as 'user' | 'merchant' | 'admin',
      email: user.email,
      isVerified: user.kycStatus === KYCStatus.APPROVED,
    };

    const token = generateToken(authUser);

    // Log registration event
    logBusinessEvent('user_registered', user.id, {
      registrationType: 'email',
    });

    return { user, token };
  }

  /**
   * Register a new user with wallet address
   */
  async registerWithWallet(
    address: string,
    signature: string,
    message: string,
    email?: string
  ): Promise<{ user: User; token: string }> {
    // Verify wallet signature
    const isValidSignature = verifyEthereumSignature(address, message, signature);
    if (!isValidSignature) {
      logSecurityEvent('invalid_signature', 'medium', { address });
      throw ErrorTypes.UNAUTHORIZED('Invalid wallet signature');
    }

    // Check if wallet address already exists
    const existingWallet = await this.prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (existingWallet) {
      throw ErrorTypes.CONFLICT(`User with wallet address ${address} already exists`);
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw ErrorTypes.CONFLICT(`User with email ${email} already exists`);
      }
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        walletAddress: address,
        email,
        role: UserRole.USER,
        kycStatus: KYCStatus.PENDING,
      },
    });

    // Create user preferences
    await this.prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    });

    // Generate authentication token
    const authUser: AuthenticatedUser = {
      id: user.id,
      address,
      role: user.role as 'user' | 'merchant' | 'admin',
      email: user.email,
      isVerified: user.kycStatus === KYCStatus.APPROVED,
    };

    const token = generateToken(authUser);

    // Log registration event
    logBusinessEvent('user_registered', user.id, {
      registrationType: 'wallet',
      walletAddress: address,
    });

    return { user, token };
  }

  /**
   * Login with email and password
   */
  async loginWithEmail(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.hashedPassword) {
      logSecurityEvent('failed_login_attempt', 'medium', {
        email,
        reason: 'user_not_found_or_no_password',
        ipAddress,
      });
      throw ErrorTypes.UNAUTHORIZED('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      logSecurityEvent('failed_login_attempt', 'medium', {
        userId: user.id,
        email,
        reason: 'invalid_password',
        ipAddress,
      });
      throw ErrorTypes.UNAUTHORIZED('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      logSecurityEvent('inactive_user_login_attempt', 'medium', {
        userId: user.id,
        email,
        ipAddress,
      });
      throw ErrorTypes.FORBIDDEN('User account is inactive');
    }

    // Generate authentication token
    const authUser: AuthenticatedUser = {
      id: user.id,
      address: user.walletAddress || '',
      role: user.role as 'user' | 'merchant' | 'admin',
      email: user.email,
      isVerified: user.kycStatus === KYCStatus.APPROVED,
    };

    const token = generateToken(authUser);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Create or update session
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: uuidv4(),
        refreshToken: refreshTokenHash,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log login event
    logBusinessEvent('user_login', user.id, {
      loginType: 'email',
      ipAddress,
    });

    return { user, token, refreshToken };
  }

  /**
   * Login with wallet signature
   */
  async loginWithWallet(
    address: string,
    signature: string,
    message: string,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    // Verify wallet signature
    const isValidSignature = verifyEthereumSignature(address, message, signature);
    if (!isValidSignature) {
      logSecurityEvent('invalid_signature', 'medium', { address, ipAddress });
      throw ErrorTypes.UNAUTHORIZED('Invalid wallet signature');
    }

    // Find user by wallet address
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user) {
      logSecurityEvent('failed_login_attempt', 'medium', {
        walletAddress: address,
        reason: 'user_not_found',
        ipAddress,
      });
      throw ErrorTypes.UNAUTHORIZED('User not found with this wallet address');
    }

    // Check if user is active
    if (!user.isActive) {
      logSecurityEvent('inactive_user_login_attempt', 'medium', {
        userId: user.id,
        walletAddress: address,
        ipAddress,
      });
      throw ErrorTypes.FORBIDDEN('User account is inactive');
    }

    // Generate authentication token
    const authUser: AuthenticatedUser = {
      id: user.id,
      address,
      role: user.role as 'user' | 'merchant' | 'admin',
      email: user.email,
      isVerified: user.kycStatus === KYCStatus.APPROVED,
    };

    const token = generateToken(authUser);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Create or update session
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: uuidv4(),
        refreshToken: refreshTokenHash,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log login event
    logBusinessEvent('user_login', user.id, {
      loginType: 'wallet',
      walletAddress: address,
      ipAddress,
    });

    return { user, token, refreshToken };
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    // Hash the refresh token for comparison
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find session by refresh token
    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshToken: refreshTokenHash,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw ErrorTypes.UNAUTHORIZED('Invalid refresh token');
    }

    // Generate new authentication token
    const authUser: AuthenticatedUser = {
      id: session.user.id,
      address: session.user.walletAddress || '',
      role: session.user.role as 'user' | 'merchant' | 'admin',
      email: session.user.email,
      isVerified: session.user.kycStatus === KYCStatus.APPROVED,
    };

    const token = generateToken(authUser);

    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // Update session with new refresh token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshTokenHash,
        lastAccessedAt: new Date(),
      },
    });

    return { token, refreshToken: newRefreshToken };
  }

  /**
   * Logout user by invalidating session
   */
  async logout(userId: string, sessionToken?: string): Promise<void> {
    if (sessionToken) {
      // Invalidate specific session
      await this.prisma.userSession.updateMany({
        where: {
          userId,
          sessionToken,
        },
        data: {
          isActive: false,
        },
      });
    } else {
      // Invalidate all sessions for user
      await this.prisma.userSession.updateMany({
        where: {
          userId,
        },
        data: {
          isActive: false,
        },
      });
    }

    logBusinessEvent('user_logout', userId);
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(email: string): Promise<string> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return 'reset_initiated';
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // In a real implementation, we would store these fields in the User model
        // For now, we'll just log them
        // resetToken: resetTokenHash,
        // resetTokenExpiry,
      },
    });

    // Log password reset initiation
    logSecurityEvent('password_reset_initiated', 'medium', {
      userId: user.id,
      email: user.email,
    });

    // In a real implementation, we would send an email with the reset token
    // For now, we'll just return the token for testing
    return resetToken;
  }

  /**
   * Complete password reset
   */
  async completePasswordReset(resetToken: string, newPassword: string): Promise<boolean> {
    // Hash the reset token for comparison
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find user by reset token
    // In a real implementation, we would query by resetToken and check expiry
    // For now, we'll just return success
    
    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    // await this.prisma.user.update({
    //   where: { resetToken: resetTokenHash },
    //   data: {
    //     hashedPassword,
    //     resetToken: null,
    //     resetTokenExpiry: null,
    //   },
    // });

    // Log password reset completion
    logSecurityEvent('password_reset_completed', 'medium', {
      // userId: user.id,
      // email: user.email,
    });

    return true;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
    }
  ): Promise<User> {
    // Check if email is being updated and if it's already in use
    if (data.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw ErrorTypes.CONFLICT(`Email ${data.email} is already in use`);
      }
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return updatedUser;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedPassword) {
      throw ErrorTypes.NOT_FOUND('User not found or has no password');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isPasswordValid) {
      logSecurityEvent('failed_password_change', 'medium', {
        userId,
        reason: 'invalid_current_password',
      });
      throw ErrorTypes.UNAUTHORIZED('Current password is incorrect');
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
      },
    });

    // Invalidate all sessions except current one
    // In a real implementation, we would keep the current session active
    // For now, we'll just log the event
    
    // Log password change
    logSecurityEvent('password_changed', 'medium', {
      userId,
    });

    return true;
  }

  /**
   * Link wallet address to existing account
   */
  async linkWalletAddress(
    userId: string,
    address: string,
    signature: string,
    message: string
  ): Promise<User> {
    // Verify wallet signature
    const isValidSignature = verifyEthereumSignature(address, message, signature);
    if (!isValidSignature) {
      logSecurityEvent('invalid_signature', 'medium', { userId, address });
      throw ErrorTypes.UNAUTHORIZED('Invalid wallet signature');
    }

    // Check if wallet address is already linked to another account
    const existingWallet = await this.prisma.user.findFirst({
      where: {
        walletAddress: address,
        id: { not: userId },
      },
    });

    if (existingWallet) {
      throw ErrorTypes.CONFLICT(`Wallet address ${address} is already linked to another account`);
    }

    // Update user with wallet address
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: address,
      },
    });

    // Log wallet linking
    logBusinessEvent('wallet_linked', userId, {
      walletAddress: address,
    });

    return updatedUser;
  }

  /**
   * Get user KYC status
   */
  async getUserKycStatus(userId: string): Promise<{
    kycStatus: KYCStatus;
    documentType?: string;
    submittedAt?: Date;
  }> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycDocument: true,
      },
    });

    if (!user) {
      throw ErrorTypes.NOT_FOUND('User not found');
    }

    return {
      kycStatus: user.kycStatus,
      documentType: user.kycDocument?.documentType,
      submittedAt: user.kycDocument?.submittedAt,
    };
  }

  /**
   * Register a new merchant
   */
  async registerMerchant(
    name: string,
    email: string,
    website: string,
    description: string,
    category: string,
    businessType: string,
    userId?: string
  ): Promise<{ merchant: any; apiKey: string }> {
    // Check if merchant email already exists
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { email },
    });

    if (existingMerchant) {
      throw ErrorTypes.CONFLICT(`Merchant with email ${email} already exists`);
    }

    // Create merchant
    const merchant = await this.prisma.merchant.create({
      data: {
        name,
        email,
        website,
        description,
        category,
        businessType: businessType as any,
      },
    });

    // Generate API key
    const apiKey = `yk_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 8);

    // Store API key
    await this.prisma.apiKey.create({
      data: {
        merchantId: merchant.id,
        userId,
        keyHash,
        keyPrefix,
        name: 'Default API Key',
        permissions: ['payments:read', 'payments:write'],
      },
    });

    // Log merchant registration
    logBusinessEvent('merchant_registered', userId, {
      merchantId: merchant.id,
      merchantName: name,
    });

    return { merchant, apiKey };
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw ErrorTypes.VALIDATION_ERROR('Password must be at least 8 characters long');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw ErrorTypes.VALIDATION_ERROR('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw ErrorTypes.VALIDATION_ERROR('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      throw ErrorTypes.VALIDATION_ERROR('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw ErrorTypes.VALIDATION_ERROR('Password must contain at least one special character');
    }
  }
}

// Create singleton instance
import { database } from '../config/database';
export const authService = new AuthService(database.getClient());