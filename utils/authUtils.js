import jwt from 'jsonwebtoken';

/**
 * Generate access and refresh tokens for a user
 * @param {string} userId - The user's ID
 * @returns {Object} Object containing accessToken and refreshToken
 */
export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  
  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  
  return { accessToken, refreshToken };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Normalize email (trim and lowercase)
 * @param {string} email - Email to normalize
 * @returns {string} Normalized email
 */
export const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

/**
 * @param {string} password 
 * @returns {Object} 
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Create a standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} additionalData - Additional data to include in response
 * @returns {Object} Standardized error response object
 */
export const createErrorResponse = (statusCode, message, additionalData = {}) => {
  return {
    status: 'error',
    statusCode,
    message,
    ...additionalData
  };
};

/**
 * Create a standardized success response
 * @param {string} message - Success message
 * @param {Object} data - Data to include in response
 * @returns {Object} Standardized success response object
 */
export const createSuccessResponse = (message, data = {}) => {
  return {
    status: 'success',
    message,
    ...data
  };
};
