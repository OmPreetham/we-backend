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

// Routes for authenticated users

// Get current authenticated user
router.get('/current-user', authenticateToken, getCurrentUser);

// Update authenticated user's profile
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

// Delete authenticated user's account
router.delete('/delete-user', authenticateToken, deleteUserAccount);

export default router;