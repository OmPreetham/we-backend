import express from 'express'
import {
  createBoard,
  updateBoard,
  deleteBoard,
  getAllBoards,
  getBoardsByUser,
  getBoardById,
} from '../controllers/boardController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', getAllBoards)

router.post('/create', authenticateToken, createBoard)
router.get('/myboards', authenticateToken, getBoardsByUser)
router.get('/:id', getBoardById)
router.put('/:id', authenticateToken, updateBoard)
router.delete('/:id', authenticateToken, deleteBoard)

export default router
