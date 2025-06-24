import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const isLoggedIn = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const accessToken = authorization.split(' ')[1];
    const payload = jwt.verify(accessToken, process.env.JWT_SECRET);

    const id = payload.id;
    if (!id) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {  // Use the correct variable `error` here
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default isLoggedIn;
