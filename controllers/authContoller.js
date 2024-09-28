import VerificationCode from '../models/VerificationCode.js'
import User from '../models/User.js'
import transporter from '../config/nodemailer.js'
import { generateOTP } from '../utils/generateOTP.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { hashEmail, encryptData, decryptData } from '../utils/encryption.js';

dotenv.config()

export const requestVerificationCodeController = async (req, res) => {
  const { email } = req.body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' })
    return
  }

  try {
    // Check if a verification code already exists and is still valid
    const existingCode = await VerificationCode.findOne({
      email,
      expiresAt: { $gt: new Date() },
    })

    if (existingCode) {
      res.status(429).json({
        error:
          'A verification code has already been sent. Please wait before requesting a new one.',
      })
      return
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    await VerificationCode.create({ email, code: otp, expiresAt })

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
    })

    res.status(200).json({ message: 'Verification code sent successfully' })
  } catch (error) {
    console.error('Error in requestVerificationCodeController:', error)
    res.status(500).json({
      error:
        'An error occurred while processing your request. Please try again later.',
    })
  }
}


export const registerController = async (req, res) => {
  const { code, username, password } = req.body;

  if (!code || !username || !password) {
    return res.status(400).json({ error: 'Code, username, and password are required' });
  }

  try {
    const verificationCode = await VerificationCode.findOne({ code });

    if (!verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (verificationCode.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash the email using HMAC-SHA256
    const hashedEmail = hashEmail(verificationCode.email);

    // Encrypt the hashed email
    const encryptedEmail = encryptData(hashedEmail);


    const newUser = new User({
      username,
      email: encryptedEmail,
      password
    });

    await newUser.save();

    await VerificationCode.deleteOne({ code });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registering user. Please try again.' });
  }
};

export const loginController = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required' });
  }

  try {
    // Find the user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Decrypt the stored hashed email
    const storedHashedEmail = decryptData(user.email);

    // Hash the input email using the same method
    const inputHashedEmail = hashEmail(email);

    // Compare the hashed emails
    if (storedHashedEmail !== inputHashedEmail) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate tokens without including the email in the payload
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

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in. Please try again later.' });
  }
};

export const refreshTokenController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findOne({ _id: decoded.userId, refreshToken });

    if (!user) {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error refreshing access token. Please try again later.' });
  }
};

export const logoutController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(400).json({ error: 'Invalid refresh token' });
    }

    // Clear the refresh token from the user's record
    user.refreshToken = null;
    await user.save();

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging out. Please try again later.' });
  }
};

export const changePasswordController = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  try {
    // Retrieve the access token from cookies
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    // Hash the new password before saving
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error changing password. Please try again later.' });
  }
};
