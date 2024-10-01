// routes/boardRoutes.js

import express from 'express';
import { body, param } from 'express-validator';
import {
  createBoard,
  updateBoard,
  deleteBoard,
  getAllBoards,
  getBoardsByUser,
  getBoardById,
  followBoard,
  unfollowBoard,
  getFollowedBoards,
} from '../controllers/boardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Static Routes

// Create a new board (authenticated)
router.post(
  '/create',
  authenticateToken,
  [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
  ],
  createBoard
);

// Get all boards (public)
router.get('/', getAllBoards);

// Get following boards
router.get('/following', authenticateToken, getFollowedBoards);

// Get boards by authenticated user
router.get('/myboards', authenticateToken, getBoardsByUser);

// 2. Parameterized Routes

// Follow a board
router.post(
  '/:boardId/follow',
  authenticateToken,
  [param('boardId').isMongoId().withMessage('Invalid Board ID')],
  followBoard
);

// Unfollow a board
router.delete(
  '/:boardId/unfollow',
  authenticateToken,
  [param('boardId').isMongoId().withMessage('Invalid Board ID')],
  unfollowBoard
);

// Get a board by ID (public)
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid board ID')],
  getBoardById
);

// Update a board (authenticated)
router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('Invalid board ID'),
    body('title')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
  ],
  updateBoard
);

// Delete a board (authenticated)
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isMongoId().withMessage('Invalid board ID')],
  deleteBoard
);

export default router;