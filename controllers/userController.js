// controllers/userController.js

import { validationResult } from 'express-validator';
import User from '../models/User.js';
import logger from '../config/logger.js';

/**
 * 1. Protected Controllers
 *    - Accessible only with valid authentication
 */

/**
 * @desc    Get Current Authenticated User
 * @route   GET /users/current-user
 * @access  Protected
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId; // Get the userId from the authenticated request
    const user = await User.findById(userId).select('-password -refreshToken'); // Exclude sensitive fields

    if (!user) {
      logger.warn('User not found in getCurrentUser: %s', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
    logger.info('Fetched current user: %s', user.username);
  } catch (error) {
    logger.error('Error fetching current user: %o', error);
    res.status(500).json({ error: 'Server error fetching user details' });
  }
};

/**
 * @desc    Update User Profile
 * @route   PUT /users/update-user
 * @access  Protected
 */
export const updateUsername = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in updateUsername: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.userId;
    const { username, role } = req.body;

    // Prevent users from updating their role
    if (role) {
      logger.warn('User %s attempted to change their role', userId);
      return res.status(403).json({ error: 'You cannot change your role' });
    }
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User not found in updateUsername: %s', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the new username is already taken
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });

      if (existingUsername) {
        logger.warn('Username already taken: %s', username);
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Update username
      user.username = username;
    }

    await user.save();

    res.status(200).json({ message: 'User profile updated successfully' });
    logger.info('User profile updated: %s', user.username);
  } catch (error) {
    logger.error('Error updating user profile: %o', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

/**
 * @desc    Delete User Account
 * @route   DELETE /users/delete-user
 * @access  Protected
 */
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.userId; // Get the userId from the authenticated request

    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User not found in deleteUserAccount: %s', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    await user.deleteOne();

    res.status(200).json({ message: 'User account deleted successfully' });
    logger.info('User account deleted: %s', user.username);
  } catch (error) {
    logger.error('Error deleting user account: %o', error);
    res.status(500).json({ error: 'Server error deleting account' });
  }
};