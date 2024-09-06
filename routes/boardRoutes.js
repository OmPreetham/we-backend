import express from 'express'
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
} from '../controllers/boardControllers.js'

const router = express.Router()

// Create a board
router.post('/create', createBoard)

// Get all boards for the authenticated user
router.get('/all', getBoards)

// Get a single board by ID
router.get('/:id', getBoardById)

// Update a board by ID
router.put('/:id', updateBoard)

// Delete a board by ID
router.delete('/:id', deleteBoard)

export default router
