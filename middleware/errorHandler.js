// middleware/errorHandler.js

import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error: %o', err);
  res.status(500).json({ error: 'Internal Server Error' });
};