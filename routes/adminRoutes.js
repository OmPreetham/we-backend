// routes/adminRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';
import {
  createModerator,
  promoteUserToModerator,
  demoteModerator,
  getAllUsers,
} from '../controllers/adminController.js';

const router = express.Router();

// Get all users (admin only)
router.get(
  '/users',
  authenticateToken,
  authorizeRoles('admin'),
  getAllUsers
);

// Create a new moderator account (admin only)
router.post(
  '/create-moderator',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('username')
      .isAlphanumeric()
      .withMessage('Username must be alphanumeric')
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
  ],
  createModerator
);

// Promote an existing user to moderator (admin only)
router.put(
  '/promote/:userId',
  authenticateToken,
  authorizeRoles('admin'),
  promoteUserToModerator
);

// Demote a moderator to regular user (admin only)
router.put(
  '/demote/:userId',
  authenticateToken,
  authorizeRoles('admin'),
  demoteModerator
);

export default router;