import express, {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { error } from 'console';

const isLoggedIn = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;
        if (!authorization) {
            return res.send.json({ error: "Unauthorized" });
        }
        const accesToken = authorization.split(" ")[1];
        const payLoad =  await wt.verify(
            accesToken,
            process.env.JWT_SECRET);

        const id = payLoad.id;
        if(!id){
            return res.send,json({error: "Invalid token provided"})
        }
        const user = await User.findById(id);
        if (!user) {
            return res.send.json({ error: "User not found" });
        }
        req.user = user;
        next();
    } catch (err) {
        if(error === "JsonWebTokenError"){
            return res.send.json({error: "Invalid token provided"})
        }
        res.status(500).json({ error: "Internal server error" });
    }
};


export default isLoggedIn;