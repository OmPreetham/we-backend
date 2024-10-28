// controllers/boardController.js

import { validationResult } from 'express-validator';
import Board from '../models/Board.js';
import Follow from '../models/Follow.js';
import logger from '../config/logger.js';

/**
 * 1. Public Controllers
 *    - Accessible without authentication
 */

/**
 * @desc    Get All Boards
 * @route   GET /boards/
 * @access  Public
 */
export const getAllBoards = async (req, res) => {
  try {
    const boards = await Board.find().populate('user', 'id username role'); // Populate user details
    res.status(200).json(boards);
    logger.info('Fetched all boards');
  } catch (error) {
    logger.error('Error fetching all boards: %o', error);
    res.status(500).json({ error: 'Error fetching all boards' });
  }
};

/**
 * @desc    Get Board by ID
 * @route   GET /boards/:id
 * @access  Public
 */
export const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id).populate('user', 'id username role'); // Populate user details

    if (!board) {
      logger.warn('Board not found: %s', id);
      return res.status(404).json({ error: 'Board not found' });
    }

    res.status(200).json(board);
    logger.info('Board fetched: %s', id);
  } catch (error) {
    logger.error('Error fetching board: %o', error);
    res.status(500).json({ error: 'Error fetching board' });
  }
};

/**
 * 2. Protected Controllers
 *    - Accessible only with valid authentication
 */

/**
 * @desc    Create a New Board
 * @route   POST /boards/create
 * @access  Protected (admin or moderator)
 */
export const createBoard = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in createBoard: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, symbolColor, systemImageName } = req.body;
    const { userId } = req.user;

    const board = new Board({
      title,
      description,
      user: userId,
      symbolColor: symbolColor || '#000000', // Use default if not provided
      systemImageName: systemImageName || 'star', // Use default if not provided
    });

    const savedBoard = await board.save();

    // Populate user's id, username, and role
    await savedBoard.populate('user', 'id username role')

    res.status(201).json(savedBoard);
    logger.info('Board created by user %s: %s', userId, savedBoard._id);
  } catch (error) {
    logger.error('Error creating board: %o', error);
    res.status(500).json({ error: 'Error creating board' });
  }
};

/**
 * @desc    Get Boards Created by Authenticated User
 * @route   GET /boards/myboards
 * @access  Protected (admin or moderator)
 */
export const getBoardsByUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const boards = await Board.find({ user: userId }).populate('user', 'id username role'); // Populate user details
    res.status(200).json(boards);
    logger.info('Boards fetched for user: %s', userId);
  } catch (error) {
    logger.error('Error fetching user boards: %o', error);
    res.status(500).json({ error: 'Error fetching boards' });
  }
};

/**
 * @desc    Get Followed Boards
 * @route   GET /boards/following
 * @access  Protected
 */
export const getFollowedBoards = async (req, res) => {
  try {
    const userId = req.user.userId;

    const follows = await Follow.find({ user: userId })
      .populate({
        path: 'board',
        populate: {
          path: 'user',
          select: 'id username role'
        }
      });
    const boards = follows.map((follow) => follow.board);

    res.status(200).json(boards);
    logger.info('Fetched followed boards for user %s', userId);
  } catch (error) {
    logger.error('Error in getFollowedBoards: %o', error);
    res.status(500).json({ error: 'Failed to get followed boards' });
  }
};

/**
 * @desc    Toggle Follow/Unfollow a Board
 * @route   POST /boards/:boardId/toggleFollow
 * @access  Protected
 */
export const toggleFollowBoard = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in toggleFollowBoard: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { boardId } = req.params;
    const userId = req.user.userId;

    // Check if the board exists
    const board = await Board.findById(boardId);
    if (!board) {
      logger.warn('Board not found in toggleFollowBoard: %s', boardId);
      return res.status(404).json({ error: 'Board not found' });
    }

    // Check if the user is already following the board
    const existingFollow = await Follow.findOne({ user: userId, board: boardId });

    if (existingFollow) {
      // Unfollow the board
      await existingFollow.deleteOne();
      res.status(200).json({ message: 'Successfully unfollowed the board' });
      logger.info('User %s unfollowed board %s', userId, boardId);
    } else {
      // Follow the board
      const follow = new Follow({ user: userId, board: boardId });
      await follow.save();
      res.status(201).json({ message: 'Successfully followed the board' });
      logger.info('User %s followed board %s', userId, boardId);
    }
  } catch (error) {
    logger.error('Error in toggleFollowBoard: %o', error);
    res.status(500).json({ error: 'Failed to toggle follow status for the board' });
  }
};

/**
 * @desc    Update a Board
 * @route   PUT /boards/:id
 * @access  Protected (admin or moderator)
 */
export const updateBoard = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in updateBoard: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { title, description, symbolColor, systemImageName } = req.body;

    const board = await Board.findById(id);

    if (!board) {
      logger.warn('Board not found for update: %s', id);
      return res.status(404).json({ error: 'Board not found' });
    }

    // Update fields if provided
    if (title) board.title = title;
    if (description) board.description = description;
    if (symbolColor) board.symbolColor = symbolColor;
    if (systemImageName) board.systemImageName = systemImageName;

    const updatedBoard = await board.save();

    // Populate user's id, username, and role
    await updatedBoard.populate('user', 'id username role');

    res.status(200).json(updatedBoard);
    logger.info('Board updated: %s', id);
  } catch (error) {
    logger.error('Error updating board: %o', error);
    res.status(500).json({ error: 'Error updating board' });
  }
};

/**
 * @desc    Delete a Board
 * @route   DELETE /boards/:id
 * @access  Protected (admin or moderator)
 */
export const deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);

    if (!board) {
      logger.warn('Board not found for deletion: %s', id);
      return res.status(404).json({ error: 'Board not found' });
    }

    await board.deleteOne();

    res.status(200).json({ message: 'Board deleted successfully' });
    logger.info('Board deleted: %s', id);
  } catch (error) {
    logger.error('Error deleting board: %o', error);
    res.status(500).json({ error: 'Error deleting board' });
  }
};
