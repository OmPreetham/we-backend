// middleware/auth.js

import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import BlacklistedToken from '../models/BacklistedToken.js';

export const authenticateToken = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    logger.warn('No token provided in authenticateToken');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Check if the token is blacklisted
    const isBlacklisted = await BlacklistedToken.findOne({ token });

    if (isBlacklisted) {
      logger.warn('Blacklisted token used: %s', token);
      return res.status(401).json({ error: 'Token is no longer valid' });
    }

    // Verify the token
    const user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = user;
    next();
  } catch (err) {
    logger.warn('Invalid token in authenticateToken: %o', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};