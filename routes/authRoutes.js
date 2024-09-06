import express from 'express'
import {
  requestVerificationCodeController,
  signupController,
  loginController,
  logoutController,
  changePasswordController,
  refreshTokenController,
} from '../controllers/authContollers.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/request', requestVerificationCodeController)
router.post('/signup', signupController)
router.post('/login', loginController)
router.post('/logout', logoutController)
router.patch('/change-password', authenticateToken, changePasswordController)
router.post('/refresh-token', refreshTokenController)

export default router
