// controllers/postController.js

import { validationResult } from 'express-validator';
import Post from '../models/Post.js';
import Board from '../models/Board.js';
import Upvote from '../models/Upvote.js';
import Downvote from '../models/Downvote.js';
import Bookmark from '../models/Bookmark.js';
import Follow from '../models/Follow.js';
import redisClient from '../config/redisClient.js';
import logger from '../config/logger.js';
import { calculateTrendingScore } from '../utils/calculateTrendingScore.js';
import cloudinary from '../config/cloudinaryConfig.js';

/**
 * 1. Public Controllers
 *    - Accessible without authentication
 */

/**
 * @desc    Get Post by ID
 * @route   GET /posts/:id
 * @access  Public
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await Post.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    const post = await Post.findById(id)
      .populate('user', 'id username role') // User details
      .populate('board', '-user') // Exclude the user field from board

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

/**
 * @desc    Get For You Posts
 * @route   GET /posts/for-you
 * @access  Protected
 */
export const getForYouPosts = async (req, res) => {
  try {
    const { userId } = req.user; // Get the authenticated user's ID
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    // Step 1: Find the boards the user is following
    const follows = await Follow.find({ user: userId }).select('board');
    const followedBoardIds = follows.map((follow) => follow.board);

    if (followedBoardIds.length === 0) {
      logger.info('User %s is not following any boards', userId);
      return res.status(200).json([]); // Return an empty array if no boards are followed
    }

    // Step 2: Fetch posts from the followed boards
    const posts = await Post.find({ board: { $in: followedBoardIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user') // Exclude the user field from board
      .lean(); // Use lean() for faster read

    // Step 3: Calculate trending score for each post
    const postsWithScore = posts.map((post) => {
      const trendingScore = calculateTrendingScore(post);
      return { ...post, trendingScore };
    });

    // Step 4: Sort posts by trending score in descending order
    postsWithScore.sort((a, b) => b.trendingScore - a.trendingScore);

    // Step 5: Limit the number of posts returned
    const trendingPosts = postsWithScore.slice(0, limit);
    logger.info('Fetched personalized posts for user %s', userId);

    res.status(200).json(trendingPosts);
  } catch (error) {
    logger.error('Error fetching personalized posts for user %s: %o', userId, error);
    res.status(500).json({ error: 'Failed to get personalized posts' });
  }
};

/**
 * 2. Protected Controllers
 *    - Accessible only with valid authentication
 */

/**
 * @desc    Create a New Post
 * @route   POST /posts/create
 * @access  Protected
 */
export const createPost = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in createPost: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, content, boardId, username: newUsername } = req.body;
    const { userId, username } = req.user;

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      logger.info('Uploading image to Cloudinary...');
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url; // Get the secure URL of the uploaded image
      console.log(imageUrl)
      logger.info('Image uploaded successfully: %s', imageUrl);
    } else {
      logger.warn('No image file provided');
    }

    // Validate Board
    const board = await Board.findById(boardId);
    if (!board) {
      logger.warn('Board not found in createPost: %s', boardId);
      return res.status(404).json({ error: 'Board not found' });
    }

    // Create the new post
    const newPost = new Post({
      title,
      content,
      user: userId,
      username: newUsername || username,
      board: boardId,
      image: imageUrl, // Save the image URL in the post
    });

    await newPost.save();

    // Populate the post with user and board details
    const populatedPost = await Post.findById(newPost._id)
      .populate('user', 'id username role') // Populate user details
      .populate('board', '-user') // Exclude user field from board
      .lean(); // Use lean() for faster read

    // Send the response with the created post
    res.status(201).json(populatedPost);
    logger.info('Post created by user %s: %s', userId, populatedPost._id);
  } catch (error) {
    logger.error('Error creating post: %o', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

/**
 * @desc    Reply to a Post
 * @route   POST /posts/:id/reply
 * @access  Protected
 */
export const replyToPost = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in replyToPost: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params; // Parent post ID
    const { title, content, username: newUsername } = req.body; // Reply details
    const { userId, username } = req.user; // Authenticated user details

    // Find the parent post
    const parentPost = await Post.findById(id);
    if (!parentPost) {
      logger.warn('Parent post not found in replyToPost: %s', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create the reply post
    const replyPost = new Post({
      title,
      content,
      user: userId,
      username: newUsername || username,
      parentPost: id,
      path: `${parentPost.path}${parentPost._id},`, // Maintain the path for replies
      board: parentPost.board, // Set the board from the parent post
    });

    // Save the reply post
    await replyPost.save();

    // Increment comment count of the parent post
    await Post.findByIdAndUpdate(id, { $inc: { commentCount: 1 } });

    // Populate user and board details for the reply post
    const populatedReplyPost = await Post.findById(replyPost._id)
      .populate('user', 'id username role') // Populate user details
      .populate('board', '-user'); // Exclude the user field from board

    // Return the populated reply post
    res.status(201).json(populatedReplyPost);
    logger.info('Reply created by user %s: %s', userId, populatedReplyPost._id);
  } catch (error) {
    logger.error('Error replying to post: %o', error);
    res.status(500).json({ error: 'Failed to reply to post' });
  }
};

/**
 * @desc    Upvote a Post
 * @route   PUT /posts/:id/upvote
 * @access  Protected
 */
export const upvotePost = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id: postId } = req.params;

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      logger.warn('Post not found in upvotePost: %s', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

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

/**
 * @desc    Downvote a Post
 * @route   PUT /posts/:id/downvote
 * @access  Protected
 */
export const downvotePost = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id: postId } = req.params;

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      logger.warn('Post not found in downvotePost: %s', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

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

/**
 * @desc    Bookmark or Unbookmark a Post
 * @route   POST /posts/:id/bookmark
 * @access  Protected
 */
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

/**
 * @desc    Check if a Post is Bookmarked by the Authenticated User
 * @route   GET /posts/:id/isBookmarked
 * @access  Protected
 */
export const isPostBookmarkedByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existingBookmark = await Bookmark.findOne({ user: userId, post: id });

    if (existingBookmark) {
      res.status(200).json({ isBookmarked: true });
      logger.info('Post %s is bookmarked by user %s', id, userId);
    } else {
      res.status(200).json({ isBookmarked: false });
      logger.info('Post %s is not bookmarked by user %s', id, userId);
    }
  } catch (error) {
    logger.error('Error in isPostBookmarkedByUser: %o', error);
    res.status(500).json({ error: 'Error checking bookmark status' });
  }
};

/**
 * @desc    Get All Bookmarked Posts for Authenticated User
 * @route   GET /posts/bookmarks
 * @access  Protected
 */
export const getBookmarkedPosts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    // Find the posts the user has bookmarked
    const bookmarks = await Bookmark.find({ user: userId }).select('post');
    const bookmarkedPostIds = bookmarks.map((bookmark) => bookmark.post);

    if (bookmarkedPostIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch posts from the bookmarked posts
    const posts = await Post.find({ _id: { $in: bookmarkedPostIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user') // Exclude the user field from board

    res.status(200).json(posts);
    logger.info('Fetched bookmarked posts for user %s', userId);
  } catch (error) {
    logger.error('Error in getBookmarkedPosts: %o', error);
    res.status(500).json({ error: 'Failed to get bookmarked posts' });
  }
};

/**
 * @desc    Get Posts with Pagination and Optional Board Filtering
 * @route   GET /posts/
 * @access  Public
 */
export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, boardId } = req.query;
    const startIndex = (page - 1) * limit;

    const query = boardId ? { board: boardId } : {};

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user') // Exclude the user field from board

    res.status(200).json(posts);
    logger.info('Posts fetched with query: %o', query);
  } catch (error) {
    logger.error('Error fetching posts: %o', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

/**
 * @desc    Get Posts by Board ID with Pagination
 * @route   GET /posts/board/:boardId
 * @access  Public
 */
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
      .populate('user', 'id username role') // Populate user details
      .populate('board', '-user') // Populate board details, excluding user field

    res.status(200).json(posts);
    logger.info('Posts fetched for board: %s', boardId);
  } catch (error) {
    logger.error('Error getting posts by board: %o', error);
    res.status(500).json({ error: 'Failed to get posts by board' });
  }
};

/**
 * @desc    Get Following Posts
 * @route   GET /posts/following
 * @access  Protected
 */
export const getFollowingPosts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    // Find the boards the user is following
    const follows = await Follow.find({ user: userId }).select('board');
    const followedBoardIds = follows.map((follow) => follow.board);

    if (followedBoardIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch posts from the followed boards
    const posts = await Post.find({ board: { $in: followedBoardIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user') // Exclude the user field from board

    res.status(200).json(posts);
    logger.info('Fetched following posts for user %s', userId);
  } catch (error) {
    logger.error('Error in getFollowingPosts: %o', error);
    res.status(500).json({ error: 'Failed to get following posts' });
  }
};

/**
 * @desc    Delete a Post
 * @route   DELETE /posts/:id/delete
 * @access  Protected
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const post = await Post.findById(id);

    if (!post) {
      logger.warn('Post not found in deletePost: %s', id);
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== userId && role !== 'moderator' && role !== 'admin') {
      logger.warn(
        'Unauthorized delete attempt by user %s (role: %s) on post %s',
        userId,
        role,
        id
      );
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete upvotes and downvotes related to this post
    await Upvote.deleteMany({ post: id });
    await Downvote.deleteMany({ post: id });

    // Delete the post itself
    await post.deleteOne();

    res.status(200).json({ message: 'Post deleted successfully' });
    logger.info('Post deleted by user %s (role: %s): %s', userId, role, id);
  } catch (error) {
    logger.error('Error deleting post: %o', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

/**
 * @desc    Get User's Posts
 * @route   GET /posts/user/:userId
 * @access  Public
 */
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user');

    res.status(200).json(posts);
    logger.info('Posts fetched for user: %s', userId);
  } catch (error) {
    logger.error('Error fetching user posts: %o', error);
    res.status(500).json({ error: 'Failed to get user posts' });
  }
};

/**
 * @desc    Get User's Replies
 * @route   GET /posts/user/:userId/replies
 * @access  Public
 */
export const getUserReplies = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    const replies = await Post.find({ user: userId, parentPost: { $ne: null } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user');

    res.status(200).json(replies);
    logger.info('Replies fetched for user: %s', userId);
  } catch (error) {
    logger.error('Error fetching user replies: %o', error);
    res.status(500).json({ error: 'Failed to get user replies' });
  }
};

/**
 * @desc    Get User's Upvoted Posts
 * @route   GET /posts/user/:userId/upvotes
 * @access  Public
 */
export const getUserUpvotes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    const upvotes = await Upvote.find({ user: userId }).select('post');
    const upvotedPostIds = upvotes.map((upvote) => upvote.post);

    const posts = await Post.find({ _id: { $in: upvotedPostIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user');

    res.status(200).json(posts);
    logger.info('Upvoted posts fetched for user: %s', userId);
  } catch (error) {
    logger.error('Error fetching user upvotes: %o', error);
    res.status(500).json({ error: 'Failed to get user upvotes' });
  }
};

/**
 * @desc    Get User's Downvoted Posts
 * @route   GET /posts/user/:userId/downvotes
 * @access  Public
 */
export const getUserDownvotes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    const downvotes = await Downvote.find({ user: userId }).select('post');
    const downvotedPostIds = downvotes.map((downvote) => downvote.post);

    const posts = await Post.find({ _id: { $in: downvotedPostIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user');

    res.status(200).json(posts);
    logger.info('Downvoted posts fetched for user: %s', userId);
  } catch (error) {
    logger.error('Error fetching user downvotes: %o', error);
    res.status(500).json({ error: 'Failed to get user downvotes' });
  }
};

/**
 * @desc    Get Replies to a Post
 * @route   GET /posts/:postId/replies
 * @access  Public
 */
export const getPostReplies = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      logger.warn('Post not found in getPostReplies: %s', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

    // Fetch replies to the post
    const replies = await Post.find({ parentPost: postId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .populate('user', 'id username role') // User details
      .populate('board', '-user'); // Exclude the user field from board

    res.status(200).json(replies);
    logger.info('Replies fetched for post: %s', postId);
  } catch (error) {
    logger.error('Error fetching post replies: %o', error);
    res.status(500).json({ error: 'Failed to get post replies' });
  }
};

/**
 * @desc    Get Parent Post if Exists
 * @route   GET /posts/:postId/parent
 * @access  Public
 */
export const getParentPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Find the post to check for a parent
    const post = await Post.findById(postId).populate('parentPost');

    if (!post) {
      logger.warn('Post not found in getParentPost: %s', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.parentPost) {
      logger.info('No parent post for post: %s', postId);
      return res.status(200).json({ message: 'No parent post exists' });
    }

    // Populate user and board details for the parent post
    const parentPost = await Post.findById(post.parentPost._id)
      .populate('user', 'id username role')
      .populate('board', '-user');

    res.status(200).json(parentPost);
    logger.info('Parent post fetched for post: %s', postId);
  } catch (error) {
    logger.error('Error fetching parent post: %o', error);
    res.status(500).json({ error: 'Failed to get parent post' });
  }
};