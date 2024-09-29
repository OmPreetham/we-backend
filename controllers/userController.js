// controllers/userController.js

import User from '../models/User.js';
import { validationResult } from 'express-validator';
import logger from '../config/logger.js';

// Get Current Authenticated User
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

// Update User Profile
export const updateUsername = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in updateUsername: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.userId; // Get the userId from the authenticated request
    const { username } = req.body;

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

// Delete User Account
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