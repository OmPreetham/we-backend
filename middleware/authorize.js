// middleware/authorize.js

import logger from '../config/logger.js';

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      logger.warn(
        'Unauthorized access attempt by user %s with role %s',
        req.user.userId,
        userRole
      );
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next(); // User is an admin, proceed to the next middleware
  }
  return res.status(403).json({ error: 'Access denied' }); // User is not an admin
};