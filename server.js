// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
// ADD THESE SWAGGER IMPORTS
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID', 
  'GOOGLE_CLIENT_SECRET',
  'JWT_SECRET'
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Import modules after env validation
const passportModule = await import('./config/passport.js');
const passport = passportModule.default;

const authModule = await import('./routes/auth.js');
const authRoutes = authModule.default;

// ADD SWAGGER CONFIGURATION
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JWT Auth API',
      version: '1.0.0',
      description: 'Authentication API with JWT and email verification',
    },
    servers: [
      {
        url: 'https://jwt-auth-api-650a.onrender.com',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token'
        },
      },
    },
  },
  apis: ['./routes/*.js'], // This will pick up your auth.js route documentation
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Connect to MongoDB
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB successfully');
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
  process.exit(1);
}

// Configure middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/info', (req, res) => {
  res.json({
    message: 'JWT Auth API is running! 🚀',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      docs: '/api-docs',
      test: '/test',
      auth: '/auth',
      info: '/info'
    },
    timestamp: new Date().toISOString()
  });
});


app.use('/auth', authRoutes);

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

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📚 Swagger docs available at: http://localhost:${PORT}/api-docs`);
});

export default app;