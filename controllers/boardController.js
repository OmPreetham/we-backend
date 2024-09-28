import Board from '../models/Board.js'
import jwt from 'jsonwebtoken'

export const createBoard = async (req, res) => {
  const { title, description } = req.body;
  
  // Extract access token from cookies
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Verify and extract the user ID from the access token
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const userId = decoded.userId;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const board = new Board({
      title,
      description,
      user: userId,
    });

    const savedBoard = await board.save();
    res.status(201).json(savedBoard);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Error creating board' });
  }
};

export const getAllBoards = async (req, res) => {
  try {
    const boards = await Board.find();
    res.status(200).json(boards);
  } catch (error) {
    console.error('Error fetching all boards:', error);
    res.status(500).json({ error: 'Error fetching all boards' });
  }
};

export const getBoardsByUser = async (req, res) => {
  // Extract access token from cookies
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Verify and extract the user ID from the access token
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const userId = decoded.userId;

    const boards = await Board.find({ user: userId });
    res.status(200).json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Error fetching boards' });
  }
};

export const getBoardById = async (req, res) => {
  const { id } = req.params;

  try {
    const board = await Board.findById(id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.status(200).json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Error fetching board' });
  }
};

export const updateBoard = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  // Extract access token from cookies
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Verify and extract the user ID from the access token
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const userId = decoded.userId;

    const board = await Board.findById(id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You are unauthorized to update this board' });
    }

    board.title = title || board.title;
    board.description = description || board.description;

    const updatedBoard = await board.save();
    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Error updating board' });
  }
};

export const deleteBoard = async (req, res) => {
  const { id } = req.params;

  // Extract access token from cookies
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Verify and extract the user ID from the access token
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const userId = decoded.userId;

    const board = await Board.findById(id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You are unauthorized to delete this board' });
    }

    await board.deleteOne();
    res.status(200).json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Error deleting board' });
  }
};