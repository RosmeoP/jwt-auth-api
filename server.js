import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { swaggerUi, swaggerSpec } from './swaggerConfig.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js'; 

dotenv.config(); 

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',  
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,  
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/api', userRoutes);  
app.use('/api', authRoutes);  

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Redirect to Swagger UI
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

const PORT = process.env.PORT || 8000;
const MONGOURI = process.env.MONGO_URI;

mongoose.connect(MONGOURI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
