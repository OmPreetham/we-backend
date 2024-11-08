// routes/postRoutes.js

import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createPost,
  replyToPost,
  upvotePost,
  downvotePost,
  bookmarkPost,
  getBookmarkedPosts,
  deletePost,
  getPosts,
  getPostById,
  getPostsByBoard,
  getTrendingPosts,
  getFollowingPosts,
  isPostBookmarkedByUser,
  getUserPosts,
  getUserReplies,
  getUserUpvotes,
  getUserDownvotes,
} from '../controllers/postController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Static Routes

// Create a new post
router.post(
  '/create',
  authenticateToken,
  [
    body('content')
      .notEmpty()
      .withMessage('Content is required')
      .isLength({ max: 5000 })
      .withMessage('Content cannot exceed 5000 characters'),
    body('boardId')
      .notEmpty()
      .withMessage('Board ID is required')
      .isMongoId()
      .withMessage('Invalid Board ID'),
    body('parentPostId')
      .optional()
      .isMongoId()
      .withMessage('Invalid Parent Post ID'),
    body('username')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
  ],
  createPost
);

// Get trending posts
router.get(
  '/trending',
  [
    query('limit')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Limit must be a positive integer'),
  ],
  getTrendingPosts
);

// Get following posts
router.get(
  '/following',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
  ],
  getFollowingPosts
);

// Get all bookmarked posts for the authenticated user
router.get('/bookmarks', authenticateToken, getBookmarkedPosts);

// Check if a post is bookmarked by the authenticated user
router.get(
  '/:id/isBookmarked',
  authenticateToken,
  [param('id').isMongoId().withMessage('Invalid Post ID')],
  isPostBookmarkedByUser
);

// 2. Parameterized Routes

// Get a post by ID
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid Post ID')],
  getPostById
);

// Get posts by board ID
router.get(
  '/board/:boardId',
  [
    param('boardId').isMongoId().withMessage('Invalid Board ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
  ],
  getPostsByBoard
);

// Get posts with optional board filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('boardId').optional().isMongoId().withMessage('Invalid Board ID'),
  ],
  getPosts
);

// Reply to a post
router.post(
  '/:id/reply',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('Invalid Post ID'),
    body('content')
      .notEmpty()
      .withMessage('Content is required')
      .isLength({ max: 5000 })
      .withMessage('Content cannot exceed 5000 characters'),
    body('username')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
  ],
  replyToPost
);

// Upvote a post
router.put(
  '/:id/upvote',
  authenticateToken,
  [param('id').isMongoId().withMessage('Invalid Post ID')],
  upvotePost
);

// Downvote a post
router.put(
  '/:id/downvote',
  authenticateToken,
  [param('id').isMongoId().withMessage('Invalid Post ID')],
  downvotePost
);

// Bookmark or unbookmark a post
router.post(
  '/:id/bookmark',
  authenticateToken,
  [param('id').isMongoId().withMessage('Invalid Post ID')],
  bookmarkPost
);

// Delete a post
router.delete(
  '/:id/delete',
  authenticateToken,
  [param('id').isMongoId().withMessage('Invalid Post ID')],
  deletePost
);

// Get a user's posts
router.get(
  '/user/:userId',
  [param('userId').isMongoId().withMessage('Invalid User ID')],
  getUserPosts
);

// Get a user's replies
router.get(
  '/user/:userId/replies',
  [param('userId').isMongoId().withMessage('Invalid User ID')],
  getUserReplies
);

// Get a user's upvoted posts
router.get(
  '/user/:userId/upvotes',
  [param('userId').isMongoId().withMessage('Invalid User ID')],
  getUserUpvotes
);

// Get a user's downvoted posts
router.get(
  '/user/:userId/downvotes',
  [param('userId').isMongoId().withMessage('Invalid User ID')],
  getUserDownvotes
);

export default router;