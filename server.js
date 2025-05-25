import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { swaggerUi, swaggerSpec } from './swaggerConfig.js';

dotenv.config(); 

const app = express();

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', authRoutes); 

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
