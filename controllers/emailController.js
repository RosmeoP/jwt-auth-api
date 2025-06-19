import User from '../models/user.js';
import { sendVerificationEmail, verifyEmailToken } from '../services/emailService.js';
import { generateTokens, normalizeEmail } from '../utils/authUtils.js';

// Verify email with token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const decoded = verifyEmailToken(token);
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.email !== decoded.email) {
      return res.status(400).json({ message: 'Invalid verification token.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified.',
        alreadyVerified: true
      });
    }

    await user.markEmailAsVerified();

    try {
      const { sendWelcomeEmail } = await import('../services/emailService.js');
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

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
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Find the user
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

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

    await sendVerificationEmail(user);

    res.json({ 
      message: 'Verification email sent! Please check your inbox.',
      email: user.email
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
};
