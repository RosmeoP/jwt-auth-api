import { Router } from 'express';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import isLoggedIn from '../middleware/user.auth.js'; 
import { refreshTokenController } from '../controllers/authController.js';
import passport from '../config/passport.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, verifyEmailToken } from '../services/emailService.js';

const router = Router();

// Helper function to generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  
  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  
  return { accessToken, refreshToken };
};

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user (requires email verification)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered, verification email sent
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    // Create unverified user
    const user = await User.createUnverifiedUser({ name, email, password });

    // Send verification email
    try {
      await sendVerificationEmail(user);
      
      res.status(201).json({ 
        message: 'Registration successful! Please check your email to verify your account.',
        requiresVerification: true,
        email: user.email
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      
      // Delete the user if email sending fails
      await User.findByIdAndDelete(user._id);
      
      res.status(500).json({ 
        message: 'Registration failed. Unable to send verification email. Please try again.' 
      });
    }

  } catch (error) {
    console.error('Register error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    if (error.message === 'User already exists with this email') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * @swagger
 * /verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully, JWT tokens returned
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    // Verify the token
    const decoded = verifyEmailToken(token);
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if email matches
    if (user.email !== decoded.email) {
      return res.status(400).json({ message: 'Invalid verification token.' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified.',
        alreadyVerified: true
      });
    }

    // Mark email as verified
    await user.markEmailAsVerified();

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the verification if welcome email fails
    }

    // Generate tokens for immediate login
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Add refresh token to user
    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      message: 'Email verified successfully! Welcome to KashKeeper!',
      accessToken,
      refreshToken,
      user: user.toPublic()
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token. Please request a new verification email.',
        expired: true
      });
    }

    res.status(500).json({ message: 'Server error during email verification.' });
  }
});

/**
 * @swagger
 * /resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified or invalid
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified.',
        alreadyVerified: true
      });
    }

    // Rate limiting check (optional)
    const lastVerificationSent = user.emailVerificationExpires;
    if (lastVerificationSent && (new Date() - lastVerificationSent) < 60000) { // 1 minute
      return res.status(429).json({ 
        message: 'Please wait before requesting another verification email.',
        waitTime: 60
      });
    }

    // Send new verification email
    await sendVerificationEmail(user);

    res.json({ 
      message: 'Verification email sent! Please check your inbox.',
      email: user.email
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user and return JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT returned
 *       400:
 *         description: Invalid credentials or email not verified
 *       500:
 *         description: Server error
 */

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const trimmedEmail = email.trim().toLowerCase();
    
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if user is using Google OAuth
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ 
        message: 'This account uses Google Sign-In. Please use the Google button below.',
        useGoogleAuth: true
      });
    }

    // For local auth users, check password
    if (user.authProvider === 'local' || user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email address before logging in.',
        requiresVerification: true,
        email: user.email
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: user.toPublic()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh the access token using the refresh token
 *     tags: [Auth]
 */

router.post('/refresh-token', refreshTokenController);

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile (protected)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', isLoggedIn, (req, res) => {
  res.json({
    message: 'Welcome to your profile',
    user: req.user.toPublic ? req.user.toPublic() : {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      profilePicture: req.user.profilePicture,
      authProvider: req.user.authProvider,
      emailVerified: req.user.emailVerified
    },
  });
});

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Authenticate with Google
 *     tags: [Auth]
 */

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google authentication callback
 *     tags: [Auth]
 */

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    try {
      if (!req.user) {
        throw new Error('No user data received from Google');
      }

      const { accessToken, refreshToken } = generateTokens(req.user._id);

      req.user.refreshTokens.push(refreshToken);
      await req.user.save();

      const userData = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        authProvider: req.user.authProvider,
        emailVerified: req.user.emailVerified
      };

      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectURL = `${frontendURL}/login?token=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify(userData))}`;
      
      res.redirect(redirectURL);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorURL = `${frontendURL}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`;
      res.redirect(errorURL);
    }
  }
);

// Logout route
router.post('/logout', isLoggedIn, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const user = await User.findById(req.user.id);
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

/**
 * @swagger
 * /update-email:
 *   put:
 *     summary: Update user email (for local auth users only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email updated successfully
 *       400:
 *         description: Invalid email or Google user trying to update
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
router.put('/update-email', isLoggedIn, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get the current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is Google user (can't update email)
    if (user.googleId || user.authProvider === 'google') {
      return res.status(400).json({ 
        message: 'Google users cannot update their email address. Email is managed by Google.' 
      });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check if email is the same as current
    if (user.email === trimmedEmail) {
      return res.status(400).json({ message: 'This is already your current email address' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Update email and mark as unverified
    user.email = trimmedEmail;
    user.emailVerified = false;
    user.emailVerifiedAt = null;
    await user.save();

    // Send verification email to new address
    try {
      await sendVerificationEmail(user);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the update if email sending fails
    }

    res.json({ 
      message: 'Email updated successfully! Please check your new email address to verify it.',
      newEmail: trimmedEmail,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Email update error:', error);
    res.status(500).json({ message: 'Server error during email update' });
  }
});

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 *       400:
 *         description: Google user cannot reset password
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    }

    // Check if user is Google user (can't reset password)
    if (user.googleId || user.authProvider === 'google') {
      return res.status(400).json({ 
        message: 'Google users cannot reset their password. Please sign in with Google.' 
      });
    }

    // Generate password reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(user, resetToken);
      
      res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Clear the reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      res.status(500).json({ 
        message: 'Failed to send password reset email. Please try again.' 
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired password reset token. Please request a new password reset.' 
      });
    }

    // Update password and clear reset token
    user.password = password; // Will be hashed by the pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ 
      message: 'Password reset successfully! You can now log in with your new password.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

export default router;