// server.js - Simplified with better error handling
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';

const app = express();

// Load environment variables FIRST
console.log('🔧 Loading environment variables...');
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID', 
  'GOOGLE_CLIENT_SECRET',
  'JWT_SECRET'
];

console.log('\n🔍 Checking environment variables:');
const missingVars = [];

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: OK`);
  } else {
    console.log(`❌ ${envVar}: MISSING`);
    missingVars.push(envVar);
  }
}

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('💡 Please check your .env file');
  console.error('💡 Make sure .env file is in your project root directory');
  console.error('💡 Example .env content:');
  console.error('   GOOGLE_CLIENT_ID=your_google_client_id');
  console.error('   GOOGLE_CLIENT_SECRET=your_google_client_secret');
  console.error('   MONGODB_URI=your_mongodb_connection_string');
  console.error('   JWT_SECRET=your_jwt_secret');
  process.exit(1);
}

// Now it's safe to import passport (after env vars are validated)
console.log('\n📦 Loading authentication modules...');
let passport, authRoutes;

try {
  const passportModule = await import('./config/passport.js');
  passport = passportModule.default;
  console.log('✅ Passport configuration loaded');
} catch (error) {
  console.error('❌ Failed to load passport configuration:', error.message);
  console.error('💡 Make sure config/passport.js exists and is properly configured');
  process.exit(1);
}

try {
  const authModule = await import('./routes/auth.js');
  authRoutes = authModule.default;
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
  process.exit(1);
}

// Connect to MongoDB
console.log('\n🔗 Connecting to MongoDB...');
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB successfully');
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// Configure middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);

// Test route
app.get('/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    environment: {
      mongoConnected: mongoose.connection.readyState === 1,
      hasGoogleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n🚀 Server started successfully!');
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
  console.log('\n✨ Ready to handle requests!');
});

export default app;