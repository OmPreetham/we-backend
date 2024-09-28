import express from 'express';
import { getCurrentUser, updateUsername, deleteUserAccount } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Routes for authenticated users
router.get('/current-user', authenticateToken, getCurrentUser);          // Get current authenticated user
router.put('/update-user', authenticateToken, updateUsername);        // Update authenticated user's profile
router.delete('/delete-user', authenticateToken, deleteUserAccount);     // Delete authenticated user's account

export default router;