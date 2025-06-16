import { Router } from 'express';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import isLoggedIn from '../middleware/user.auth.js'; 
import { refreshTokenController } from '../controllers/authController.js';
import passport from '../config/passport.js';

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
 *     summary: Register a new user
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
 *       201:
 *         description: User registered and token returned
 *       400:
 *         description: User already exists
 *       500:
 *         description: Server error
 */

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      authProvider: 'local'
    });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Add refresh token to user
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(201).json({ 
      accessToken,
      refreshToken,
      user: user.toPublic()
    });
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate key error, email must be unique' });
    }

    res.status(500).json({ message: 'Server error' });
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
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const trimmedEmail = email.trim().toLowerCase();
    
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      console.log("User not found:", email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if user is using Google OAuth
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ 
        message: 'Please use Google Sign-In for this account',
        useGoogleAuth: true
      });
    }

    // For local auth users, check password
    if (user.authProvider === 'local' || user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log("Password mismatch for:", email);
        return res.status(400).json({ message: 'Invalid email or password' });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: user.toPublic()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh the access token using the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token received from the login endpoint
 *     responses:
 *       200:
 *         description: New access token and refresh token returned
 *       400:
 *         description: Refresh token required
 *       403:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Server error
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
 *     responses:
 *       200:
 *         description: Returns the user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', isLoggedIn, (req, res) => {
  res.json({
    message: 'Welcome to your profile',
    user: req.user.toPublic ? req.user.toPublic() : {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      profilePicture: req.user.profilePicture,
      authProvider: req.user.authProvider
    },
  });
});

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Authenticate with Google
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       500:
 *         description: Server error
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
 *     responses:
 *       200:
 *         description: Google authentication successful, JWT returned
 *       500:
 *         description: Server error
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
        authProvider: req.user.authProvider
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

export default router;