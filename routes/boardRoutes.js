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
import { authorizeRoles } from '../middleware/authorize.js';

const router = express.Router();

// Utility function to validate hex color codes
const isHexColor = (value) => /^#([0-9A-F]{3}){1,2}$/i.test(value);

// Optionally, define a list of allowed system image names
const allowedSystemImages = [
  // Basic Shapes
  "star.fill", "circle.fill", "square.fill", "triangle.fill", "hexagon.fill", "octagon.fill", "pentagon.fill",

  // Education & Professional
  "graduationcap.fill", "book.fill", "briefcase.fill", "building.columns.fill", "studentdesk", "chart.bar.fill", 
  "person.crop.circle.fill", "person.fill", "person.3.fill", "signature", 

  // Technology & Tools
  "desktopcomputer", "laptopcomputer", "printer.fill", "camera.fill", "lock.fill", "keyboard.fill", "network",

  // Communication & Social
  "message.fill", "phone.fill", "envelope.fill", "bubble.left.fill", "person.2.fill", "person.3.fill", 

  // Travel & Daily Life
  "airplane", "car.fill", "bicycle", "map.fill", "globe.americas.fill", "calendar", "tray.fill", "ruler.fill",

  // Nature & Elements
  "leaf.fill", "sun.max.fill", "moon.fill", "cloud.fill", "drop.fill", "flame.fill", "wind",

  // Food & Drink
  "cup.and.saucer.fill", "fork.knife.fill", "wineglass.fill", "carrot.fill", "applelogo",

  // Health & Fitness
  "heart.fill", "bandage.fill", "staroflife.fill", "stethoscope.fill", "hare.fill", "tortoise.fill",

  // Miscellaneous
  "magnifyingglass", "paperclip", "bookmark.fill", "globe", "person.crop.circle.badge.checkmark", "creditcard.fill"
];

// 1. Public Routes (No Authentication Required)

// Get all boards (public)
router.get('/', getAllBoards);

// Get boards followed by the authenticated user
router.get('/following', authenticateToken, getFollowedBoards);

// Get boards created by the authenticated user (moderator or admin only)
router.get(
  '/myboards',
  authenticateToken,
  authorizeRoles('admin', 'moderator'),
  getBoardsByUser
);

// Get a board by ID (public)
router.get(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid board ID'),
  ],
  getBoardById
);

// 2. Protected Routes (Authentication Required)

// Follow a board
router.post(
  '/:boardId/follow',
  authenticateToken,
  [
    param('boardId')
      .isMongoId()
      .withMessage('Invalid Board ID'),
  ],
  followBoard
);

// Unfollow a board
router.delete(
  '/:boardId/unfollow',
  authenticateToken,
  [
    param('boardId')
      .isMongoId()
      .withMessage('Invalid Board ID'),
  ],
  unfollowBoard
);

// Create a new board (moderator or admin only)
router.post(
  '/create',
  authenticateToken,
  authorizeRoles('admin', 'moderator'),
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
    body('symbolColor')
      .optional()
      .custom(isHexColor)
      .withMessage('symbolColor must be a valid hex color code'),
    body('systemImageName')
      .optional()
      .isIn(allowedSystemImages)
      .withMessage(`systemImageName must be one of: ${allowedSystemImages.join(', ')}`),
  ],
  createBoard
);

// Update a board (moderator or admin only)
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'moderator'),
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid board ID'),
    body('title')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('symbolColor')
      .optional()
      .custom(isHexColor)
      .withMessage('symbolColor must be a valid hex color code'),
    body('systemImageName')
      .optional()
      .isIn(allowedSystemImages)
      .withMessage(`systemImageName must be one of: ${allowedSystemImages.join(', ')}`),
  ],
  updateBoard
);

// Delete a board (moderator or admin only)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'moderator'),
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid board ID'),
  ],
  deleteBoard
);

export default router;