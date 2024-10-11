// controllers/adminController.js

import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { hashEmail, encryptData } from '../utils/encryption.js';
import logger from '../config/logger.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.status(200).json(users);
    logger.info('Admin fetched all users');
  } catch (error) {
    logger.error('Error fetching all users: %o', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

// Create a new moderator account
export const createModerator = async (req, res) => {
  const { username, password, email } = req.body;

  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in createModerator: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      logger.warn('Username already taken: %s', username);
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash and encrypt the email
    const hashedEmail = hashEmail(email);
    const encryptedEmail = encryptData(hashedEmail);

    const newModerator = new User({
      username,
      email: encryptedEmail,
      password,
      role: 'moderator',
    });

    await newModerator.save();

    res.status(201).json({ message: 'Moderator account created successfully' });
    logger.info('Admin created moderator: %s', username);
  } catch (error) {
    logger.error('Error creating moderator: %o', error);
    res.status(500).json({ error: 'Error creating moderator' });
  }
};

// Promote an existing user to moderator
export const promoteUserToModerator = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User not found for promotion: %s', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'moderator' || user.role === 'admin') {
      logger.warn('User is already a moderator or admin: %s', userId);
      return res.status(400).json({ error: 'User is already a moderator or admin' });
    }

    user.role = 'moderator';
    await user.save();

    res.status(200).json({ message: 'User promoted to moderator' });
    logger.info('User promoted to moderator: %s', user.username);
  } catch (error) {
    logger.error('Error promoting user: %o', error);
    res.status(500).json({ error: 'Error promoting user to moderator' });
  }
};

// Demote a moderator to regular user
export const demoteModerator = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User not found for demotion: %s', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'moderator') {
      logger.warn('User is not a moderator: %s', userId);
      return res.status(400).json({ error: 'User is not a moderator' });
    }

    user.role = 'user';
    await user.save();

    res.status(200).json({ message: 'Moderator demoted to user' });
    logger.info('Moderator demoted to user: %s', user.username);
  } catch (error) {
    logger.error('Error demoting moderator: %o', error);
    res.status(500).json({ error: 'Error demoting moderator' });
  }
};