import express from 'express'
import {
  requestVerificationCodeController,
  signupController,
  loginController,
  logoutController,
  changePasswordController,
  refreshTokenController,
} from '../controllers/authContoller.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/verify', requestVerificationCodeController)
router.post('/signup', signupController)
router.post('/login', loginController)
router.post('/logout', logoutController)
router.patch('/change-password', authenticateToken, changePasswordController)
router.post('/refresh-token', refreshTokenController)

export default router
