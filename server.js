import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { swaggerUi, swaggerSpec } from './swaggerConfig.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); 

const app = express();

app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', authRoutes); 

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
