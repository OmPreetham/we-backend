// routes/userRoutes.js

import express from 'express';
import { body } from 'express-validator';
import {
  getCurrentUser,
  updateUsername,
  deleteUserAccount,
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Public Routes (If Any)
// Currently, all routes are protected. If you have any public user-related routes in the future, place them here.

// 2. Protected Routes (Authentication Required)

// Get Current Authenticated User
router.get(
  '/current-user',
  authenticateToken,
  getCurrentUser
);

// Update Authenticated User's Profile
router.put(
  '/update-user',
  authenticateToken,
  [
    body('username')
      .optional()
      .isAlphanumeric()
      .withMessage('Username must be alphanumeric')
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
  ],
  updateUsername
);

// Delete Authenticated User's Account
router.delete(
  '/delete-user',
  authenticateToken,
  deleteUserAccount
);

export default router;