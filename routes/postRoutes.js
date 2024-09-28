import express from 'express'
import {
  createPost,
  replyToPost,
  upvotePost,
  downvotePost,
  deletePost,
  getPosts,
  getPostById,
  getPostsByBoard,
} from '../controllers/postController.js'
import {
  getBookmarkedPosts,
  bookmarkPost,
} from '../controllers/bookmarkController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/create', authenticateToken, createPost)
router.post('/:id/reply', authenticateToken, replyToPost)
router.put('/:id/upvote', authenticateToken, upvotePost)
router.put('/:id/downvote', authenticateToken, downvotePost)
router.delete('/:id/delete', authenticateToken, deletePost)
router.get('/bookmarks', authenticateToken, getBookmarkedPosts)
router.post('/:id/bookmark', authenticateToken, bookmarkPost)
router.get('/', getPosts)
router.get('/:id', getPostById)
router.get('/board/:boardId', getPostsByBoard)

export default router
