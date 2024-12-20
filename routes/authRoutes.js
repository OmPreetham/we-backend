// routes/authRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redisClient.js';
import dotenv from 'dotenv';
import {
  requestVerificationCodeController,
  registerController,
  loginController,
  logoutController,
  changePasswordController,
  refreshTokenController,
} from '../controllers/authContoller.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../config/logger.js';

dotenv.config();

const router = express.Router();

// Rate Limiter configuration for login
const loginRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_rate_limiter',
  points: 5, // Number of points
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes if consumed more than points
});

// Middleware to use rate limiter for login
const loginRateLimiterMiddleware = (req, res, next) => {
  loginRateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch((err) => {
      if (err instanceof Error) {
        // Redis or other error
        logger.error('Rate limiter error (login): %o', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        // Rate limit exceeded
        logger.warn('Too many login attempts from IP: %s', req.ip);
        res.status(429).json({
          error: 'Too many login attempts. Please try again after 15 minutes.',
        });
      }
    });
};

// Rate Limiter configuration for registration
const registerRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'register_rate_limiter',
  points: 10,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60, // Block for 1 hour if consumed more than points
});

// Middleware to use rate limiter for registration
const registerRateLimiterMiddleware = (req, res, next) => {
  registerRateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch((err) => {
      if (err instanceof Error) {
        logger.error('Rate limiter error (register): %o', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        logger.warn('Too many registration attempts from IP: %s', req.ip);
        res.status(429).json({
          error: 'Too many accounts created from this IP, please try again after an hour.',
        });
      }
    });
};

// Rate Limiter configuration for verification code requests
const verificationCodeRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'verification_code_rate_limiter',
  points: 3,
  duration: 10 * 60, // 10 minutes
  blockDuration: 10 * 60, // Block for 10 minutes if consumed more than points
});

// Middleware to use rate limiter for verification code requests
const verificationCodeRateLimiterMiddleware = (req, res, next) => {
  verificationCodeRateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch((err) => {
      if (err instanceof Error) {
        logger.error('Rate limiter error (verification code): %o', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        logger.warn('Too many verification code requests from IP: %s', req.ip);
        res.status(429).json({
          error: 'Too many verification code requests. Please try again after 10 minutes.',
        });
      }
    });
};

// 2. Public Routes (No Authentication Required)

// Request Verification Code Route
router.post(
  '/requestverificationcode',
  verificationCodeRateLimiterMiddleware,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
  ],
  requestVerificationCodeController
);

// Register Route
router.post(
  '/register',
  registerRateLimiterMiddleware,
  [
    body('code')
      .notEmpty()
      .withMessage('Verification code is required'),
    body('username')
      .isAlphanumeric()
      .withMessage('Username must be alphanumeric')
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  registerController
);

// Login Route
router.post(
  '/login',
  loginRateLimiterMiddleware,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('username')
      .isAlphanumeric()
      .withMessage('Username must be alphanumeric'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  loginController
);

// Refresh Token Route
router.post('/refresh-token', refreshTokenController);

// 3. Protected Routes (Authentication Required)

// Logout Route
router.post('/logout', authenticateToken, logoutController);

// Change Password Route
router.patch(
  '/change-password',
  authenticateToken,
  [
    body('oldPassword')
      .notEmpty()
      .withMessage('Old password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  changePasswordController
);

export default router;