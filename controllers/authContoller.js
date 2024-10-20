// controllers/authController.js

import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import transporter from '../config/nodemailer.js';
import { generateOTP } from '../utils/generateOTP.js';
import { hashEmail, encryptData } from '../utils/encryption.js';
import BlacklistedToken from '../models/BacklistedToken.js';
import logger from '../config/logger.js';

dotenv.config();

/**
 * 1. Public Controllers
 *    - Accessible without authentication
 */

/**
 * @desc    Request Verification Code
 * @route   POST /auth/requestverificationcode
 * @access  Public
 */
export const requestVerificationCodeController = async (req, res) => {
  const { email } = req.body;

  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in requestVerificationCodeController: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  // Check if the email ends with @islander.tamucc.edu
  if (!email.toLowerCase().endsWith('@islander.tamucc.edu')) {
    logger.warn('Invalid email domain attempted: %s', email);
    return res.status(400).json({
      error: 'Please use a valid @islander.tamucc.edu email address.'
    });
  }

  try {
    // Check if a verification code already exists and is still valid
    const existingCode = await VerificationCode.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (existingCode) {
      logger.warn('Verification code already sent to email: %s', email);
      return res.status(429).json({
        error:
          'A verification code has already been sent. Please wait before requesting a new one.',
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await VerificationCode.create({ email, code: otp, expiresAt });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your Verification Code',
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
      html: `
        <h1>Your Verification Code</h1>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>It is valid for 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `,
    });

    res.status(200).json({ message: 'Verification code sent successfully' });
    logger.info('Verification code sent to email: %s', email);
  } catch (error) {
    logger.error('Error in requestVerificationCodeController: %o', error);
    res.status(500).json({
      error:
        'An error occurred while processing your request. Please try again later.',
    });
  }
};

/**
 * @desc    Register New User
 * @route   POST /auth/register
 * @access  Public
 */
export const registerController = async (req, res) => {
  const { code, username, password } = req.body;

  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in registerController: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const verificationCode = await VerificationCode.findOne({ code });

    if (!verificationCode) {
      logger.warn('Invalid verification code used: %s', code);
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (verificationCode.expiresAt < new Date()) {
      logger.warn('Verification code expired: %s', code);
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      logger.warn('Username already taken: %s', username);
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash and encrypt the email
    const hashedEmail = hashEmail(verificationCode.email);
    const encryptedEmail = encryptData(hashedEmail);

    // Create the new user
    const newUser = new User({
      username,
      email: encryptedEmail,
      password: password,
      role: 'user', // Explicitly set the role to 'user'
    });

    await newUser.save();

    // Delete the verification code
    await VerificationCode.deleteOne({ code });

    res.status(201).json({ message: 'User registered successfully' });
    logger.info('User registered successfully: %s', username);
  } catch (error) {
    if (error.code === 11000) {
      logger.warn('Duplicate key error in registerController: %o', error);
      res.status(400).json({ error: 'Duplicate key error. Please try again.' });
    } else {
      logger.error('Error in registerController: %o', error);
      res.status(500).json({ error: 'Error registering user. Please try again.' });
    }
  }
};

/**
 * @desc    User Login
 * @route   POST /auth/login
 * @access  Public
 */
export const loginController = async (req, res) => {
  const { email, username, password } = req.body;

  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in loginController: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Hash and encrypt the input email for comparison
    const hashedEmail = hashEmail(email);
    const encryptedEmail = encryptData(hashedEmail);

    // Find the user by username and encrypted email
    const user = await User.findOne({
      username,
      email: encryptedEmail,
    });

    if (!user) {
      logger.warn('Invalid credentials for username: %s', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Invalid password for username: %s', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save the refresh token in the user's record
    user.refreshToken = refreshToken;
    await user.save();

    // Set tokens in HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Ensure secure flag is true in production
      maxAge: 15 * 60 * 1000,
      sameSite: 'Strict',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'Strict',
    });

    res.status(200).json({ message: 'Login successful' });
    logger.info('User logged in: %s', username);
  } catch (error) {
    logger.error('Error in loginController: %o', error);
    res.status(500).json({ error: 'Error logging in. Please try again later.' });
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /auth/refresh-token
 * @access  Public
 */
export const refreshTokenController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    logger.warn('No refresh token provided in refreshTokenController');
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findOne({ _id: decoded.userId, refreshToken });

    if (!user) {
      logger.warn('Invalid refresh token in refreshTokenController');
      return res.status(400).json({ error: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
      sameSite: 'Strict',
    });

    res.status(200).json({ message: 'Access token refreshed successfully' });
    logger.info('Access token refreshed for user: %s', user.username);
  } catch (error) {
    logger.error('Error in refreshTokenController: %o', error);
    res.status(500).json({ error: 'Error refreshing access token. Please try again later.' });
  }
};

/**
 * 2. Protected Controllers
 *    - Accessible only with valid authentication
 */

/**
 * @desc    Logout User
 * @route   POST /auth/logout
 * @access  Protected
 */
export const logoutController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const accessToken = req.cookies.accessToken;

  if (!refreshToken || !accessToken) {
    logger.warn('No tokens provided in logoutController');
    return res.status(400).json({ error: 'Tokens are required' });
  }

  try {
    const user = await User.findOne({ refreshToken });

    if (!user) {
      logger.warn('Invalid refresh token in logoutController');
      return res.status(400).json({ error: 'Invalid refresh token' });
    }

    // Clear the refresh token from the user's record
    user.refreshToken = null;
    await user.save();

    // Blacklist the access token
    const decoded = jwt.decode(accessToken);

    if (decoded && decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000); // Convert to milliseconds

      await BlacklistedToken.create({
        token: accessToken,
        expiresAt,
      });
    } else {
      logger.warn('Failed to decode access token in logoutController');
    }

    // Clear the cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    res.status(200).json({ message: 'Logout successful' });
    logger.info('User logged out: %s', user.username);
  } catch (error) {
    logger.error('Error in logoutController: %o', error);
    res.status(500).json({ error: 'Error logging out. Please try again later.' });
  }
};

/**
 * @desc    Change User Password
 * @route   PATCH /auth/change-password
 * @access  Protected
 */
export const changePasswordController = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in changePasswordController: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User not found in changePasswordController: %s', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      logger.warn('Incorrect old password for user: %s', user.username);
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
    logger.info('Password changed for user: %s', user.username);
  } catch (error) {
    logger.error('Error in changePasswordController: %o', error);
    res.status(500).json({ error: 'Error changing password. Please try again later.' });
  }
};