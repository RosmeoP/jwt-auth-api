import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';


const app = express();
dotenv.config();

const PORT = process.env.PORT || 8000;
const MONGOURI = process.env.MONGO_URI 




mongoose.connect(MONGOURI).then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) =>{
    console.log(error)
})

User.findOne().then(() => {
    console.log("User found");
})