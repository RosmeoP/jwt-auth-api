import passport from '../config/passport.js';
import { generateTokens } from './userController.js';

// Google OAuth initiation
export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

// Google OAuth callback
export const googleCallback = async (req, res) => {
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
};
