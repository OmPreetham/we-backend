import Board from '../models/Board.js'

// Create a new board
export const createBoard = async (req, res) => {
  const { title, description } = req.body

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' })
  }

  try {
    const board = new Board({
      title,
      description,
      user: req.user.userId,
    })

    const savedBoard = await board.save()
    res.status(201).json(savedBoard)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error creating board' })
  }
}

// Get all boards for the authenticated user
export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({ user: req.user.userId })
    res.status(200).json(boards)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error fetching boards' })
  }
}

// Get a single board by ID
export const getBoardById = async (req, res) => {
  const { id } = req.params

  try {
    const board = await Board.findById(id)

    if (!board || board.user.toString() !== req.user.userId.toString()) {
      return res.status(404).json({ error: 'Board not found' })
    }

    res.status(200).json(board)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error fetching board' })
  }
}

// Update a board by ID
export const updateBoard = async (req, res) => {
  const { id } = req.params
  const { title, description } = req.body

  try {
    const board = await Board.findById(id)

    if (!board || board.user.toString() !== req.user.userId.toString()) {
      return res.status(404).json({ error: 'Board not found' })
    }

    board.title = title || board.title
    board.description = description || board.description

    const updatedBoard = await board.save()
    res.status(200).json(updatedBoard)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error updating board' })
  }
}

// Delete a board by ID
export const deleteBoard = async (req, res) => {
  const { id } = req.params

  try {
    const board = await Board.findById(id)

    if (!board || board.user.toString() !== req.user.userId.toString()) {
      return res.status(404).json({ error: 'Board not found' })
    }

    await board.deleteOne()
    res.status(200).json({ message: 'Board deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error deleting board' })
  }
}
