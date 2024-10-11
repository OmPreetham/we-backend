// middleware/auth.js

import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import BlacklistedToken from '../models/BacklistedToken.js';
import User from '../models/User.js';

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
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch user role from the database
    const user = await User.findById(decodedToken.userId).select('role');

    if (!user) {
      logger.warn('User not found during token authentication: %s', decodedToken.userId);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      userId: decodedToken.userId,
      role: user.role,
    };

    next();
  } catch (err) {
    logger.warn('Invalid token in authenticateToken: %o', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};