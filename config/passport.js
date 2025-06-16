// config/passport.js
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.js';

// Load environment variables FIRST
dotenv.config();

console.log('Loading Google OAuth Strategy...');

// Check if environment variables are loaded
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('❌ GOOGLE_CLIENT_ID is not set in environment variables');
  console.error('💡 Check your .env file and make sure GOOGLE_CLIENT_ID is set');
  process.exit(1);
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_SECRET is not set in environment variables');
  console.error('💡 Check your .env file and make sure GOOGLE_CLIENT_SECRET is set');
  process.exit(1);
}

console.log('✅ Google OAuth credentials loaded successfully');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/google/callback`,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth callback triggered for user:', profile.displayName);
      console.log('Google OAuth Profile:', {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails[0]?.value
      });

      // Use the static method we created in the User model
      const user = await User.findOrCreateGoogleUser(profile);
      console.log('User found/created:', user.email);
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Serialize user for session (if using sessions)
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user._id);
  done(null, user._id);
});

// Deserialize user from session (if using sessions)
passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user:', id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('Deserialize error:', error);
    done(error, null);
  }
});

console.log('✅ Google OAuth Strategy configured successfully');

export default passport;