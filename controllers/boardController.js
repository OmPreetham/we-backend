// controllers/boardController.js

import Board from '../models/Board.js';
import logger from '../config/logger.js';
import { validationResult } from 'express-validator';

// Create a new board
export const createBoard = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in createBoard: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description } = req.body;
    const userId = req.user.userId; // Get the userId from authenticated request

    const board = new Board({
      title,
      description,
      user: userId,
    });

    const savedBoard = await board.save();

    res.status(201).json(savedBoard);
    logger.info('Board created by user %s: %s', userId, savedBoard._id);
  } catch (error) {
    logger.error('Error creating board: %o', error);
    res.status(500).json({ error: 'Error creating board' });
  }
};

// Get all boards
export const getAllBoards = async (req, res) => {
  try {
    const boards = await Board.find();
    res.status(200).json(boards);
    logger.info('Fetched all boards');
  } catch (error) {
    logger.error('Error fetching all boards: %o', error);
    res.status(500).json({ error: 'Error fetching all boards' });
  }
};

// Get boards by authenticated user
export const getBoardsByUser = async (req, res) => {
  try {
    const userId = req.user.userId; // Get the userId from authenticated request

    const boards = await Board.find({ user: userId });
    res.status(200).json(boards);
    logger.info('Boards fetched for user: %s', userId);
  } catch (error) {
    logger.error('Error fetching user boards: %o', error);
    res.status(500).json({ error: 'Error fetching boards' });
  }
};

// Get board by ID
export const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);

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

// Update a board
export const updateBoard = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in updateBoard: %o', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.userId; // Get the userId from authenticated request

    const board = await Board.findById(id);

    if (!board) {
      logger.warn('Board not found for update: %s', id);
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.user.toString() !== userId) {
      logger.warn('Unauthorized update attempt by user %s on board %s', userId, id);
      return res.status(403).json({ error: 'You are unauthorized to update this board' });
    }

    // Update fields if provided
    if (title) board.title = title;
    if (description) board.description = description;

    const updatedBoard = await board.save();

    res.status(200).json(updatedBoard);
    logger.info('Board updated by user %s: %s', userId, id);
  } catch (error) {
    logger.error('Error updating board: %o', error);
    res.status(500).json({ error: 'Error updating board' });
  }
};

// Delete a board
export const deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // Get the userId from authenticated request

    const board = await Board.findById(id);

    if (!board) {
      logger.warn('Board not found for deletion: %s', id);
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.user.toString() !== userId) {
      logger.warn('Unauthorized deletion attempt by user %s on board %s', userId, id);
      return res.status(403).json({ error: 'You are unauthorized to delete this board' });
    }

    await board.deleteOne();

    res.status(200).json({ message: 'Board deleted successfully' });
    logger.info('Board deleted by user %s: %s', userId, id);
  } catch (error) {
    logger.error('Error deleting board: %o', error);
    res.status(500).json({ error: 'Error deleting board' });
  }
};