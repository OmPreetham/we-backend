import Board from '../models/Board.js'

export const createBoard = async (req, res) => {
  const { title, description } = req.body
  const userId = req.user?.userId

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' })
  }

  try {
    const board = new Board({
      title,
      description,
      user: userId,
    })

    const savedBoard = await board.save()
    res.status(201).json(savedBoard)
  } catch (error) {
    console.error('Error creating board:', error)
    res.status(500).json({ error: 'Error creating board' })
  }
}

export const getAllBoards = async (req, res) => {
  try {
    const boards = await Board.find()
    res.status(200).json(boards)
  } catch (error) {
    console.error('Error fetching all boards:', error)
    res.status(500).json({ error: 'Error fetching all boards' })
  }
}

export const getBoardsByUser = async (req, res) => {
  const userId = req.user?.userId

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  try {
    const boards = await Board.find({ user: userId })
    res.status(200).json(boards)
  } catch (error) {
    console.error('Error fetching boards:', error)
    res.status(500).json({ error: 'Error fetching boards' })
  }
}

export const getBoardById = async (req, res) => {
  const { id } = req.params

  try {
    const board = await Board.findById(id)

    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }

    // Optionally check if the board belongs to the user
    // if (board.user.toString() !== req.user.userId.toString()) {
    //   return res.status(403).json({ error: 'Unauthorized' })
    // }

    res.status(200).json(board)
  } catch (error) {
    console.error('Error fetching board:', error)
    res.status(500).json({ error: 'Error fetching board' })
  }
}

export const updateBoard = async (req, res) => {
  const { id } = req.params
  const { title, description } = req.body
  const userId = req.user?.userId

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  try {
    const board = await Board.findById(id)

    if (!board || board.user.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Board not found' })
    }

    board.title = title || board.title
    board.description = description || board.description

    const updatedBoard = await board.save()
    res.status(200).json(updatedBoard)
  } catch (error) {
    console.error('Error updating board:', error)
    res.status(500).json({ error: 'Error updating board' })
  }
}

export const deleteBoard = async (req, res) => {
  const { id } = req.params
  const userId = req.user?.userId
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  try {
    const board = await Board.findById(id)

    if (!board || board.user.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Board not found' })
    }

    await board.deleteOne()
    res.status(200).json({ message: 'Board deleted successfully' })
  } catch (error) {
    console.error('Error deleting board:', error)
    res.status(500).json({ error: 'Error deleting board' })
  }
}
