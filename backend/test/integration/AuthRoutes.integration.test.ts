import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { database } from '../../src/config/database';
import { YieldRailsServer } from '../../src/index';
import { authService } from '../../src/services/AuthService';
import { verifyEthereumSignature } from '../../src/middleware/auth';

// Mock auth middleware functions
jest.mock('../../src/middleware/auth', () => {
  const originalModule = jest.requireActual('../../src/middleware/auth');
  return {
    ...originalModule,
    verifyEthereumSignature: jest.fn().mockReturnValue(true),
    generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  };
});

describe('Auth Routes Integration Tests', () => {
  let app: any;
  let server: any;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Initialize server
    const yieldRailsServer = new YieldRailsServer();
    await yieldRailsServer.start();
    app = yieldRailsServer['app'];
    server = yieldRailsServer['server'];
    prisma = database.prisma;

    // Clean up database before tests
    await prisma.userSession.deleteMany({});
    await prisma.userPreferences.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.merchant.deleteMany({});
    await prisma.apiKey.deleteMany({});
  });

  afterAll(async () => {
    // Clean up database after tests
    await prisma.userSession.deleteMany({});
    await prisma.userPreferences.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.merchant.deleteMany({});
    await prisma.apiKey.deleteMany({});

    // Close server
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  describe('POST /api/auth/register/email', () => {
    it('should register a new user with email and password', async () => {
      const response = await request(app)
        .post('/api/auth/register/email')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.firstName).toBe('Test');
      expect(response.body.user.lastName).toBe('User');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
      expect(user?.firstName).toBe('Test');
      expect(user?.lastName).toBe('User');
    });

    it('should return validation errors for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/register/email')
        .send({
          email: 'invalid-email',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return conflict error for existing email', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register/email')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          firstName: 'Duplicate',
          lastName: 'User',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register/email')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          firstName: 'Another',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toHaveProperty('code', 'CONFLICT');
    });
  });

  describe('POST /api/auth/register/wallet', () => {
    it('should register a new user with wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/register/wallet')
        .send({
          address: '0x1234567890abcdef',
          signature: 'valid-signature',
          message: 'Sign this message to register',
          email: 'wallet-user@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.walletAddress).toBe('0x1234567890abcdef');
      expect(response.body.user.email).toBe('wallet-user@example.com');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { walletAddress: '0x1234567890abcdef' },
      });
      expect(user).not.toBeNull();
      expect(user?.walletAddress).toBe('0x1234567890abcdef');
      expect(user?.email).toBe('wallet-user@example.com');
    });

    it('should return validation errors for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/register/wallet')
        .send({
          address: '',
          signature: '',
          message: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login/email', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      await prisma.user.create({
        data: {
          email: 'login-test@example.com',
          hashedPassword,
          firstName: 'Login',
          lastName: 'Test',
          isActive: true,
        },
      });
    });

    it('should login a user with email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login/email')
        .send({
          email: 'login-test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('login-test@example.com');
    });

    it('should return unauthorized for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login/email')
        .send({
          email: 'login-test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/login/wallet', () => {
    beforeEach(async () => {
      // Create test user with wallet
      await prisma.user.create({
        data: {
          email: 'wallet-login@example.com',
          walletAddress: '0xabcdef1234567890',
          isActive: true,
        },
      });
    });

    it('should login a user with wallet signature', async () => {
      const response = await request(app)
        .post('/api/auth/login/wallet')
        .send({
          address: '0xabcdef1234567890',
          signature: 'valid-signature',
          message: 'Sign this message to login',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.walletAddress).toBe('0xabcdef1234567890');
    });

    it('should return unauthorized for invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/login/wallet')
        .send({
          address: '0xnonexistent',
          signature: 'valid-signature',
          message: 'Sign this message to login',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  describe('Protected routes', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'protected-routes@example.com',
          hashedPassword: await bcrypt.hash('Password123!', 12),
          isActive: true,
        },
      });
      userId = user.id;

      // Login to get token
      const response = await request(app)
        .post('/api/auth/login/email')
        .send({
          email: 'protected-routes@example.com',
          password: 'Password123!',
        });

      authToken = response.body.token;
    });

    describe('POST /api/auth/logout', () => {
      it('should logout a user', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Logout successful');
      });

      it('should return unauthorized without token', async () => {
        const response = await request(app).post('/api/auth/logout');

        expect(response.status).toBe(401);
        expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      });
    });

    describe('PUT /api/auth/profile', () => {
      it('should update user profile', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'Updated',
            lastName: 'User',
            phoneNumber: '+1234567890',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Profile updated successfully');
        expect(response.body.user.firstName).toBe('Updated');
        expect(response.body.user.lastName).toBe('User');
        expect(response.body.user.phoneNumber).toBe('+1234567890');

        // Verify user was updated in database
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });
        expect(user?.firstName).toBe('Updated');
        expect(user?.lastName).toBe('User');
        expect(user?.phoneNumber).toBe('+1234567890');
      });
    });

    describe('POST /api/auth/password/change', () => {
      it('should change user password', async () => {
        const response = await request(app)
          .post('/api/auth/password/change')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'Password123!',
            newPassword: 'NewPassword123!',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Password changed successfully');

        // Verify password was changed by logging in with new password
        const loginResponse = await request(app)
          .post('/api/auth/login/email')
          .send({
            email: 'protected-routes@example.com',
            password: 'NewPassword123!',
          });

        expect(loginResponse.status).toBe(200);
      });

      it('should return unauthorized for incorrect current password', async () => {
        const response = await request(app)
          .post('/api/auth/password/change')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewPassword123!',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      });
    });

    describe('POST /api/auth/merchant/register', () => {
      it('should register a new merchant', async () => {
        const response = await request(app)
          .post('/api/auth/merchant/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Merchant',
            email: 'merchant@example.com',
            website: 'https://example.com',
            description: 'Test merchant description',
            category: 'ecommerce',
            businessType: 'ONLINE',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Merchant registered successfully');
        expect(response.body).toHaveProperty('merchant');
        expect(response.body).toHaveProperty('apiKey');
        expect(response.body.merchant.name).toBe('Test Merchant');
        expect(response.body.merchant.email).toBe('merchant@example.com');

        // Verify merchant was created in database
        const merchant = await prisma.merchant.findUnique({
          where: { email: 'merchant@example.com' },
        });
        expect(merchant).not.toBeNull();
        expect(merchant?.name).toBe('Test Merchant');
      });
    });

    describe('GET /api/auth/kyc/status', () => {
      it('should get user KYC status', async () => {
        const response = await request(app)
          .get('/api/auth/kyc/status')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('kycStatus');
      });
    });
  });

  describe('Password reset flow', () => {
    beforeEach(async () => {
      // Create test user
      await prisma.user.create({
        data: {
          email: 'reset-password@example.com',
          hashedPassword: await bcrypt.hash('Password123!', 12),
          isActive: true,
        },
      });
    });

    it('should initiate password reset', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({
          email: 'reset-password@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password reset initiated');
      
      // In development mode, we should get the reset token
      if (process.env.NODE_ENV === 'development') {
        expect(response.body).toHaveProperty('resetToken');
      }
    });

    it('should complete password reset', async () => {
      // First initiate reset
      const initiateResponse = await request(app)
        .post('/api/auth/password/reset')
        .send({
          email: 'reset-password@example.com',
        });

      const resetToken = initiateResponse.body.resetToken;

      // Complete reset
      const completeResponse = await request(app)
        .post('/api/auth/password/reset/complete')
        .send({
          resetToken,
          newPassword: 'NewPassword123!',
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body).toHaveProperty('message');
      expect(completeResponse.body.message).toContain('Password reset successful');
    });
  });
});