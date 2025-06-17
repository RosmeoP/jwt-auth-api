import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const createTransporter = () => {
  const emailPassword = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  if (!emailPassword) {
    throw new Error('Email password not configured');
  }
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword
      }
    });
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPassword
    }
  });
};

// Generate email verification token
export const generateVerificationToken = (userId, email) => {
  if (!process.env.EMAIL_VERIFICATION_SECRET) {
    throw new Error('Email verification secret not configured');
  }
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'email_verification',
      timestamp: Date.now()
    },
    process.env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify email verification token
export const verifyEmailToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired verification token');
  }
};

// Email templates
const getVerificationEmailHTML = (userName, verificationLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - KashKeeper</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #4285F4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .btn:hover { background: #3367d6; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to KashKeeper!</h1>
            <p>Your personal expense tracking companion</p>
        </div>
        <div class="content">
            <h2>Hi ${userName}! 👋</h2>
            <p>Thank you for joining KashKeeper! We're excited to help you take control of your finances.</p>
            
            <p><strong>To complete your registration, please verify your email address by clicking the button below:</strong></p>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="btn">✅ Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${verificationLink}</p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This link will expire in 24 hours</li>
                    <li>If you didn't create an account, please ignore this email</li>
                    <li>Never share this verification link with anyone</li>
                </ul>
            </div>
            
            <p>Best regards,<br>The KashKeeper Team</p>
        </div>
        <div class="footer">
            <p>© 2025 KashKeeper. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const getVerificationEmailText = (userName, verificationLink) => `
Hi ${userName}!

Welcome to KashKeeper! 🎉

To complete your registration, please verify your email address by clicking this link:
${verificationLink}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
The KashKeeper Team

© 2025 KashKeeper. All rights reserved.
`;

// Send verification email
export const sendVerificationEmail = async (user) => {
  const transporter = createTransporter();
  const verificationToken = generateVerificationToken(user._id, user.email);
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const mailOptions = {
    from: {
      name: 'KashKeeper',
      address: process.env.EMAIL_FROM || process.env.EMAIL_USER
    },
    to: user.email,
    subject: '✅ Verify Your Email - KashKeeper',
    text: getVerificationEmailText(user.name, verificationLink),
    html: getVerificationEmailHTML(user.name, verificationLink)
  };
  const result = await transporter.sendMail(mailOptions);
  return { success: true, messageId: result.messageId };
};

// Send welcome email (after verification)
export const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();
    const welcomeHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎊 Email Verified Successfully!</h1>
            </div>
            <div class="content">
                <h2>Welcome aboard, ${user.name}! 🚀</h2>
                <p>Your email has been verified and your account is now fully active.</p>
                <p>You can now enjoy all KashKeeper features:</p>
                <ul>
                    <li>📊 Track expenses in real-time</li>
                    <li>💰 Create and manage budgets</li>
                    <li>📈 View detailed spending reports</li>
                    <li>🎯 Set and achieve financial goals</li>
                </ul>
                <p>Ready to start your financial journey? <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #4285F4;">Go to Dashboard</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
    const mailOptions = {
      from: {
        name: 'KashKeeper',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: user.email,
      subject: '🎊 Welcome to KashKeeper - You\'re All Set!',
      html: welcomeHTML
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Don't throw error - welcome email is not critical
  }
};

export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  generateVerificationToken,
  verifyEmailToken
};