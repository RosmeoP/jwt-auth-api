import { Router } from "express";
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

// Register route
router.post("/register", async (req, res) => {
    try{
        const {email, passsword} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password: hashedPassword,
        });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        res.status(201).json({token});
    }
    catch (error) {
        console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
    }
})

export default router;