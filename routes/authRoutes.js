import express from 'express'
import {
  requestVerificationCodeController,
  registerController,
  loginController,
  logoutController,
  changePasswordController,
  refreshTokenController,
} from '../controllers/authContoller.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/requestverificationcode', requestVerificationCodeController)
router.post('/register', registerController)
router.post('/login', loginController)
router.post('/logout', logoutController)
router.patch('/change-password', authenticateToken, changePasswordController)
router.post('/refresh-token', refreshTokenController)

export default router
