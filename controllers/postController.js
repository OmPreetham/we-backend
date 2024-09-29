// controllers/postController.js

import Post from '../models/Post.js';
import Board from '../models/Board.js';
import Upvote from '../models/Upvote.js';
import Downvote from '../models/Downvote.js';
import Bookmark from '../models/Bookmark.js';
import redisClient from '../config/redisClient.js';
import logger from '../config/logger.js';
import { validationResult } from 'express-validator';

// Create a new post
export const createPost = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in createPost: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, parentPostId, boardId, username: newUsername } = req.body;
    const { userId, username } = req.user;

    const board = await Board.findById(boardId);
    if (!board) {
      logger.warn('Board not found in createPost: %s', boardId);
      return res.status(404).json({ error: 'Board not found' });
    }

    let postPath = ',';

    if (parentPostId) {
      const parentPost = await Post.findById(parentPostId);
      if (!parentPost) {
        logger.warn('Parent post not found in createPost: %s', parentPostId);
        return res.status(404).json({ error: 'Parent post not found' });
      }
      postPath = `${parentPost.path}${parentPost._id},`;
    }

    const newPost = new Post({
      content,
      user: userId,
      username: newUsername || username,
      parentPost: parentPostId || null,
      path: postPath,
      board: boardId,
    });

    await newPost.save();
    res.status(201).json(newPost);
    logger.info('Post created by user %s: %s', userId, newPost._id);
  } catch (error) {
    logger.error('Error creating post: %o', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Reply to a post
export const replyToPost = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in replyToPost: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { content, username: newUsername } = req.body;
    const { userId, username } = req.user;

    const parentPost = await Post.findById(id);
    if (!parentPost) {
      logger.warn('Parent post not found in replyToPost: %s', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    const replyPost = new Post({
      content,
      user: userId,
      username: newUsername || username,
      parentPost: id,
      path: `${parentPost.path}${parentPost._id},`,
      board: parentPost.board,
    });

    await replyPost.save();
    res.status(201).json(replyPost);
    logger.info('Reply created by user %s: %s', userId, replyPost._id);
  } catch (error) {
    logger.error('Error replying to post: %o', error);
    res.status(500).json({ error: 'Failed to reply to post' });
  }
};

// Upvote a post
export const upvotePost = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id: postId } = req.params;

    const existingUpvote = await Upvote.findOne({ user: userId, post: postId });

    if (existingUpvote) {
      await Upvote.deleteOne({ user: userId, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { upvoteCount: -1 } });
      logger.info('Upvote removed by user %s on post %s', userId, postId);
      return res.status(200).json({ message: 'Upvote removed' });
    }

    const existingDownvote = await Downvote.findOne({ user: userId, post: postId });
    if (existingDownvote) {
      await Downvote.deleteOne({ user: userId, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { downvoteCount: -1 } });
    }

    const upvote = new Upvote({ user: userId, post: postId });
    await upvote.save();
    await Post.findByIdAndUpdate(postId, { $inc: { upvoteCount: 1 } });

    res.status(201).json({ message: 'Post upvoted' });
    logger.info('Post upvoted by user %s: %s', userId, postId);
  } catch (error) {
    logger.error('Error upvoting post: %o', error);
    res.status(500).json({ error: 'Failed to upvote post' });
  }
};

// Downvote a post
export const downvotePost = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id: postId } = req.params;

    const existingDownvote = await Downvote.findOne({ user: userId, post: postId });

    if (existingDownvote) {
      await Downvote.deleteOne({ user: userId, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { downvoteCount: -1 } });
      logger.info('Downvote removed by user %s on post %s', userId, postId);
      return res.status(200).json({ message: 'Downvote removed' });
    }

    const existingUpvote = await Upvote.findOne({ user: userId, post: postId });
    if (existingUpvote) {
      await Upvote.deleteOne({ user: userId, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { upvoteCount: -1 } });
    }

    const downvote = new Downvote({ user: userId, post: postId });
    await downvote.save();
    await Post.findByIdAndUpdate(postId, { $inc: { downvoteCount: 1 } });

    res.status(201).json({ message: 'Post downvoted' });
    logger.info('Post downvoted by user %s: %s', userId, postId);
  } catch (error) {
    logger.error('Error downvoting post: %o', error);
    res.status(500).json({ error: 'Failed to downvote post' });
  }
};

// Bookmark or unbookmark a post
export const bookmarkPost = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in bookmarkPost: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(id);
    if (!post) {
      logger.warn('Post not found in bookmarkPost: %s', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingBookmark = await Bookmark.findOne({ user: userId, post: id });

    if (existingBookmark) {
      await existingBookmark.deleteOne();
      await redisClient.del(`user:${userId}:bookmarkedPosts`);
      res.status(200).json({ message: 'Post removed from bookmarks' });
      logger.info('Bookmark removed by user %s on post %s', userId, id);
    } else {
      const newBookmark = new Bookmark({ user: userId, post: id });
      await newBookmark.save();
      await redisClient.del(`user:${userId}:bookmarkedPosts`);
      res.status(200).json({ message: 'Post bookmarked successfully' });
      logger.info('Post bookmarked by user %s: %s', userId, id);
    }
  } catch (error) {
    logger.error('Error in bookmarkPost: %o', error);
    res.status(500).json({ error: 'Error bookmarking post' });
  }
};

// Get all bookmarked posts for the authenticated user
export const getBookmarkedPosts = async (req, res) => {
  const userId = req.user.userId;
  const cacheKey = `user:${userId}:bookmarkedPosts`;

  try {
    // Attempt to get cached bookmarks
    const cachedBookmarkedPosts = await redisClient.get(cacheKey);
    if (cachedBookmarkedPosts) {
      logger.info('Retrieved bookmarked posts from cache for user %s', userId);
      return res.status(200).json(JSON.parse(cachedBookmarkedPosts));
    }

    // Fetch bookmarks from the database
    const bookmarks = await Bookmark.find({ user: userId })
      .populate('post')
      .lean();

    const bookmarkedPosts = bookmarks.map((bookmark) => bookmark.post);

    // Cache the results
    await redisClient.set(cacheKey, JSON.stringify(bookmarkedPosts), 'EX', 3600);

    res.status(200).json(bookmarkedPosts);
    logger.info('Bookmarked posts fetched for user %s', userId);
  } catch (error) {
    logger.error('Error retrieving bookmarked posts: %o', error);
    res.status(500).json({ error: 'Error retrieving bookmarked posts' });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const post = await Post.findById(id);

    if (!post) {
      logger.warn('Post not found in deletePost: %s', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== userId) {
      logger.warn('Unauthorized delete attempt by user %s on post %s', userId, id);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete upvotes and downvotes related to this post
    await Upvote.deleteMany({ post: id });
    await Downvote.deleteMany({ post: id });

    // Optionally, delete any replies to this post
    // await Post.deleteMany({ parentPost: id });

    // Delete the post itself
    await post.deleteOne();

    res.status(200).json({ message: 'Post deleted successfully' });
    logger.info('Post deleted by user %s: %s', userId, id);
  } catch (error) {
    logger.error('Error deleting post: %o', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// Get posts with pagination and optional board filtering
export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, boardId } = req.query;
    const startIndex = (page - 1) * limit;

    const query = boardId ? { board: boardId } : {};

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'username')
      .populate('board', 'title');

    res.status(200).json(posts);
    logger.info('Posts fetched with query: %o', query);
  } catch (error) {
    logger.error('Error fetching posts: %o', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

// Get a post by ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate('user', 'username')
      .populate('board', 'title description');

    if (!post) {
      logger.warn('Post not found in getPostById: %s', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json(post);
    logger.info('Post fetched: %s', id);
  } catch (error) {
    logger.error('Error getting post by ID: %o', error);
    res.status(500).json({ error: 'Failed to get post by ID' });
  }
};

// Get posts by board ID
export const getPostsByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    const board = await Board.findById(boardId);
    if (!board) {
      logger.warn('Board not found in getPostsByBoard: %s', boardId);
      return res.status(404).json({ error: 'Board not found' });
    }

    const posts = await Post.find({ board: boardId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'username');

    res.status(200).json(posts);
    logger.info('Posts fetched for board: %s', boardId);
  } catch (error) {
    logger.error('Error getting posts by board: %o', error);
    res.status(500).json({ error: 'Failed to get posts by board' });
  }
};