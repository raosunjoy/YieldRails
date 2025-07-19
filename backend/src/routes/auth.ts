import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/AuthService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger, logSecurityEvent } from '../utils/logger';

const router = Router();

/**
 * @route POST /api/auth/register/email
 * @desc Register a new user with email and password
 * @access Public
 */
router.post(
  '/register/email',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Register user
    const { user, token } = await authService.registerWithEmail(
      email,
      password,
      firstName,
      lastName
    );

    // Return user and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      token,
    });
  })
);

/**
 * @route POST /api/auth/register/wallet
 * @desc Register a new user with wallet address
 * @access Public
 */
router.post(
  '/register/wallet',
  [
    body('address').isString().withMessage('Please provide a wallet address'),
    body('signature').isString().withMessage('Please provide a signature'),
    body('message').isString().withMessage('Please provide a message'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address, signature, message, email } = req.body;

    // Register user
    const { user, token } = await authService.registerWithWallet(
      address,
      signature,
      message,
      email
    );

    // Return user and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      token,
    });
  })
);

/**
 * @route POST /api/auth/login/email
 * @desc Login with email and password
 * @access Public
 */
router.post(
  '/login/email',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isString().withMessage('Please provide a password'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const deviceInfo = req.body.deviceInfo || '';
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent') || '';

    // Login user
    const { user, token, refreshToken } = await authService.loginWithEmail(
      email,
      password,
      deviceInfo,
      ipAddress,
      userAgent
    );

    // Return user and tokens
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      token,
      refreshToken,
    });
  })
);

/**
 * @route POST /api/auth/login/wallet
 * @desc Login with wallet signature
 * @access Public
 */
router.post(
  '/login/wallet',
  [
    body('address').isString().withMessage('Please provide a wallet address'),
    body('signature').isString().withMessage('Please provide a signature'),
    body('message').isString().withMessage('Please provide a message'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address, signature, message } = req.body;
    const deviceInfo = req.body.deviceInfo || '';
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent') || '';

    // Login user
    const { user, token, refreshToken } = await authService.loginWithWallet(
      address,
      signature,
      message,
      deviceInfo,
      ipAddress,
      userAgent
    );

    // Return user and tokens
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      token,
      refreshToken,
    });
  })
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh authentication token
 * @access Public
 */
router.post(
  '/refresh',
  [body('refreshToken').isString().withMessage('Please provide a refresh token')],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;

    // Refresh token
    const { token, refreshToken: newRefreshToken } = await authService.refreshToken(refreshToken);

    // Return new tokens
    res.json({
      message: 'Token refreshed successfully',
      token,
      refreshToken: newRefreshToken,
    });
  })
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Protected
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const sessionToken = req.body.sessionToken;

    // Logout user
    await authService.logout(userId, sessionToken);

    res.json({
      message: 'Logout successful',
    });
  })
);

/**
 * @route POST /api/auth/password/reset
 * @desc Initiate password reset
 * @access Public
 */
router.post(
  '/password/reset',
  [body('email').isEmail().withMessage('Please provide a valid email')],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Initiate password reset
    const resetToken = await authService.initiatePasswordReset(email);

    // In production, we would send an email with the reset token
    // For development, we'll return the token
    res.json({
      message: 'Password reset initiated. Check your email for instructions.',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  })
);

/**
 * @route POST /api/auth/password/reset/complete
 * @desc Complete password reset
 * @access Public
 */
router.post(
  '/password/reset/complete',
  [
    body('resetToken').isString().withMessage('Please provide a reset token'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resetToken, newPassword } = req.body;

    // Complete password reset
    await authService.completePasswordReset(resetToken, newPassword);

    res.json({
      message: 'Password reset successful. You can now login with your new password.',
    });
  })
);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Protected
 */
router.put(
  '/profile',
  authMiddleware,
  [
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('phoneNumber').optional().isMobilePhone('any').withMessage('Please provide a valid phone number'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const { firstName, lastName, email, phoneNumber } = req.body;

    // Update user profile
    const updatedUser = await authService.updateUserProfile(userId, {
      firstName,
      lastName,
      email,
      phoneNumber,
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        walletAddress: updatedUser.walletAddress,
        role: updatedUser.role,
        kycStatus: updatedUser.kycStatus,
      },
    });
  })
);

/**
 * @route POST /api/auth/password/change
 * @desc Change user password
 * @access Protected
 */
router.post(
  '/password/change',
  authMiddleware,
  [
    body('currentPassword').isString().withMessage('Please provide your current password'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Change password
    await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully',
    });
  })
);

/**
 * @route POST /api/auth/wallet/link
 * @desc Link wallet address to existing account
 * @access Protected
 */
router.post(
  '/wallet/link',
  authMiddleware,
  [
    body('address').isString().withMessage('Please provide a wallet address'),
    body('signature').isString().withMessage('Please provide a signature'),
    body('message').isString().withMessage('Please provide a message'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const { address, signature, message } = req.body;

    // Link wallet address
    const updatedUser = await authService.linkWalletAddress(userId, address, signature, message);

    res.json({
      message: 'Wallet address linked successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        walletAddress: updatedUser.walletAddress,
      },
    });
  })
);

/**
 * @route GET /api/auth/kyc/status
 * @desc Get user KYC status
 * @access Protected
 */
router.get(
  '/kyc/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Get KYC status
    const kycStatus = await authService.getUserKycStatus(userId);

    res.json({
      kycStatus,
    });
  })
);

/**
 * @route POST /api/auth/merchant/register
 * @desc Register a new merchant
 * @access Protected
 */
router.post(
  '/merchant/register',
  authMiddleware,
  [
    body('name').isString().withMessage('Please provide a merchant name'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('website').isURL().withMessage('Please provide a valid website URL'),
    body('description').isString().withMessage('Please provide a description'),
    body('category').isString().withMessage('Please provide a category'),
    body('businessType').isString().withMessage('Please provide a business type'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const { name, email, website, description, category, businessType } = req.body;

    // Register merchant
    const { merchant, apiKey } = await authService.registerMerchant(
      name,
      email,
      website,
      description,
      category,
      businessType,
      userId
    );

    res.status(201).json({
      message: 'Merchant registered successfully',
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        website: merchant.website,
        description: merchant.description,
        category: merchant.category,
        businessType: merchant.businessType,
        verificationStatus: merchant.verificationStatus,
      },
      apiKey,
    });
  })
);

export { router as authRouter };