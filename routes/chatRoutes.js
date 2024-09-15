import express from 'express'
import {
  createChat,
  sendMessage,
  getMessages,
} from '../controllers/chatController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/create', authenticateToken, createChat)
router.post('/message', authenticateToken, sendMessage)
router.get('/:chatId/messages', authenticateToken, getMessages)

export default router
