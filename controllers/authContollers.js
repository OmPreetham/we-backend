import VerificationCode from '../models/VerificationCode.js'
import User from '../models/User.js'
import transporter from '../config/nodemailer.js'
import { generateOTP } from '../utils/generateOTP.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export const requestVerificationCodeController = async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // OTP valid for 10 minutes

    // Save OTP to the database
    await VerificationCode.create({ email, code: otp, expiresAt })

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your Verification Code',
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    })

    res.status(200).json({ message: 'Verification code sent' })
  } catch (error) {
    res.status(500).json({ error: 'Error generating OTP. Please try again.' })
  }
}

export const signupController = async (req, res) => {
  const { code, username, password } = req.body

  if (!code || !username || !password) {
    return res
      .status(400)
      .json({ error: 'Code, username, and password are required' })
  }

  try {
    // Check if the OTP exists and is valid
    const verificationCode = await VerificationCode.findOne({ code })

    if (!verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    // Check if OTP has expired
    if (verificationCode.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' })
    }

    // Check if the user already exists with the email
    const existingUsername = await User.findOne({ username })

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    // Create a new user with the provided username, email, and password
    const newUser = new User({
      username,
      email: verificationCode.email,
      password,
    })

    // Save the new user
    await newUser.save()

    // Optionally, delete the verification code after successful registration
    await VerificationCode.deleteOne({ code })

    res.status(201).json({ message: 'User registered successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error registering user. Please try again.' })
  }
}

export const loginController = async (req, res) => {
  const { email, username, password } = req.body

  if (!email || !username || !password) {
    return res
      .status(400)
      .json({ error: 'Email, username and password are required' })
  }

  try {
    // Find user by email
    const user = await User.findOne({ email, username })

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    // Generate JWT access token
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET, // Secret key for access token
      { expiresIn: '15m' } // Access token expires in 15 minutes
    )

    // Generate JWT refresh token
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET, // Secret key for refresh token
      { expiresIn: '7d' } // Refresh token expires in 7 days
    )

    // Store the refresh token in the database (optional, but recommended for security)
    user.refreshToken = refreshToken
    await user.save()

    // Send response with tokens
    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error logging in. Please try again later.' })
  }
}

export const refreshTokenController = async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' })
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findOne({ _id: decoded.userId, refreshToken })

    if (!user) {
      return res.status(400).json({ error: 'Invalid refresh token' })
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    )

    res.status(200).json({
      message: 'Access token refreshed successfully',
      accessToken,
    })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ error: 'Error refreshing access token. Please try again later.' })
  }
}

export const logoutController = async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' })
  }

  try {
    // Find user by refresh token
    const user = await User.findOne({ refreshToken })

    if (!user) {
      return res.status(400).json({ error: 'Invalid refresh token' })
    }

    // Remove refresh token from user record
    user.refreshToken = null
    await user.save()

    res.status(200).json({ message: 'Logout successful' })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ error: 'Error logging out. Please try again later.' })
  }
}

export const changePasswordController = async (req, res) => {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: 'Old password and new password are required' })
  }

  try {
    // Get user from request (assuming user info is available via middleware)
    const userId = req.user.userId
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)

    if (!isOldPasswordValid) {
      return res.status(400).json({ error: 'Old password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ error: 'Error changing password. Please try again later.' })
  }
}
