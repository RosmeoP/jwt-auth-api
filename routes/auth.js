import { Router } from 'express';
import isLoggedIn from '../middleware/user.auth.js'; 
import { refreshTokenController } from '../controllers/authController.js';
import passport from '../config/passport.js';

// Import all controller functions
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  logoutUser, 
  updateUserEmail,
  deleteAccount
} from '../controllers/userController.js';

import { 
  verifyEmail, 
  resendVerification 
} from '../controllers/emailController.js';

import { 
  forgotPassword, 
  resetPassword,
  changePassword 
} from '../controllers/passwordController.js';

import { 
  googleAuth, 
  googleCallback 
} from '../controllers/googleAuthController.js';

const router = Router();

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
router.post('/register', registerUser);

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
router.post('/verify-email', verifyEmail);

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
router.post('/resend-verification', resendVerification);

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
router.post('/login', loginUser);

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
router.get('/profile', isLoggedIn, getUserProfile);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Authenticate with Google
 *     tags: [Auth]
 */
router.get('/google', googleAuth);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google authentication callback
 *     tags: [Auth]
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  googleCallback
);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', isLoggedIn, logoutUser);

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
router.put('/update-email', isLoggedIn, updateUserEmail);

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
router.post('/forgot-password', forgotPassword);

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
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /change-password:
 *   put:
 *     summary: Change password for authenticated user
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
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *               newPassword:
 *                 type: string
 *                 description: New password to set
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid password or validation error
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/change-password', isLoggedIn, changePassword);

/**
 * @swagger
 * /delete-account:
 *   delete:
 *     summary: Delete user account permanently
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: Required for local auth users, not required for Google users
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted:
 *                   type: boolean
 *       400:
 *         description: Invalid password or missing password for local users
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/delete-account', isLoggedIn, deleteAccount);

export default router;