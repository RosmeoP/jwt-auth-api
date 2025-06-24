import User from '../models/user.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, verifyEmailToken } from '../services/emailService.js';
import { generateTokens, isValidEmail, normalizeEmail, validatePassword } from '../utils/authUtils.js';

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ message: passwordValidation.message });
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
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const trimmedEmail = normalizeEmail(email);
    
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
};

// Get user profile
export const getUserProfile = (req, res) => {
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
};

export const logoutUser = async (req, res) => {
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
};

export const updateUserEmail = async (req, res) => {
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

    const trimmedEmail = normalizeEmail(email);

    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (user.email === trimmedEmail) {
      return res.status(400).json({ message: 'This is already your current email address' });
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    user.email = trimmedEmail;
    user.emailVerified = false;
    user.emailVerifiedAt = null;
    await user.save();

    // Send verification email to new address
    try {
      await sendVerificationEmail(user);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
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
};

// Delete user account
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Get the current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For non-Google users, verify password
    if (user.authProvider === 'local' && user.password) {
      if (!password) {
        return res.status(400).json({ message: 'Password is required to delete your account' });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid password. Please check your password and try again.' });
      }
    }

    // TODO: Here you might want to:
    // 1. Delete user-related data from other collections (expenses, budgets, goals, etc.)
    // 2. Log the account deletion for audit purposes
    // 3. Send a confirmation email (optional)

    // For now, we'll just delete the user document
    // In a real application, you might want to soft-delete or archive the data
    await User.findByIdAndDelete(userId);

    console.log(`Account deleted for user: ${user.email} (ID: ${userId})`);

    res.json({ 
      message: 'Account deleted successfully. We\'re sorry to see you go!',
      deleted: true
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
};

export { generateTokens };
