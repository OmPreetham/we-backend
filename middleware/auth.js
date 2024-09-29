// middleware/auth.js
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

export const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    logger.warn('No token provided in authenticateToken');
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token in authenticateToken: %o', err);
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};