import Post from '../models/Post.js'
import Board from '../models/Board.js'
import Upvote from '../models/Upvote.js'
import Downvote from '../models/Downvote.js'

export const createPost = async (req, res) => {
  const { content, parentPostId, boardId } = req.body
  const { userId, username } = req.user

  try {
    const board = await Board.findById(boardId)
    if (!board) return res.status(404).json({ error: 'Board not found' })

    let postPath = ''

    if (parentPostId) {
      const parentPost = await Post.findById(parentPostId)
      if (!parentPost)
        return res.status(404).json({ error: 'Parent post not found' })
      postPath = `${parentPost.path}${parentPost._id},`
    }

    const newPost = new Post({
      content,
      user: userId,
      username,
      parentPost: parentPostId || null,
      path: postPath || ',',
      board: boardId,
    })

    await newPost.save()
    res.status(201).json(newPost)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create post' })
  }
}

export const replyToPost = async (req, res) => {
  const { id } = req.params
  const { content } = req.body

  try {
    const parentPost = await Post.findById(id)
    if (!parentPost) return res.status(404).json({ error: 'Post not found' })

    const replyPost = new Post({
      content,
      user: req.user.userId,
      username: req.user.username,
      parentPost: id,
      path: `${parentPost.path}${parentPost._id},`,
      board: parentPost.board,
    })

    await replyPost.save()
    res.status(201).json(replyPost)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to reply to post' })
  }
}

export const upvotePost = async (req, res) => {
  const { userId } = req.user
  const { id: postId } = req.params

  try {
    const existingUpvote = await Upvote.findOne({ user: userId, post: postId })

    if (existingUpvote) {
      await Upvote.deleteOne({ user: userId, post: postId })
      await Post.findByIdAndUpdate(postId, { $inc: { upvoteCount: -1 } })
      return res.status(200).json({ message: 'Upvote removed' })
    }

    const existingDownvote = await Downvote.findOne({
      user: userId,
      post: postId,
    })
    if (existingDownvote) {
      await Downvote.deleteOne({ user: userId, post: postId })
      await Post.findByIdAndUpdate(postId, { $inc: { downvoteCount: -1 } })
    }

    const upvote = new Upvote({ user: userId, post: postId })
    await upvote.save()
    await Post.findByIdAndUpdate(postId, { $inc: { upvoteCount: 1 } })

    res.status(201).json({ message: 'Post upvoted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to upvote post' })
  }
}

export const downvotePost = async (req, res) => {
  const { userId } = req.user
  const { id: postId } = req.params

  try {
    const existingDownvote = await Downvote.findOne({
      user: userId,
      post: postId,
    })

    if (existingDownvote) {
      await Downvote.deleteOne({ user: userId, post: postId })
      await Post.findByIdAndUpdate(postId, { $inc: { downvoteCount: -1 } })
      return res.status(200).json({ message: 'Downvote removed' })
    }

    const existingUpvote = await Upvote.findOne({ user: userId, post: postId })
    if (existingUpvote) {
      await Upvote.deleteOne({ user: userId, post: postId })
      await Post.findByIdAndUpdate(postId, { $inc: { upvoteCount: -1 } })
    }

    const downvote = new Downvote({ user: userId, post: postId })
    await downvote.save()
    await Post.findByIdAndUpdate(postId, { $inc: { downvoteCount: 1 } })

    res.status(201).json({ message: 'Post downvoted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to downvote post' })
  }
}

export const deletePost = async (req, res) => {
  const { id } = req.params
  const { userId } = req.user

  try {
    const post = await Post.findById(id)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Check if the post belongs to the user
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Delete upvotes and downvotes related to this post
    await Upvote.deleteMany({ post: id })
    await Downvote.deleteMany({ post: id })

    // Optionally, delete any replies to this post
    // await Post.deleteMany({ parentPost: id })

    // Delete the post itself
    await post.deleteOne()

    res.status(200).json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
}

export const getPosts = async (req, res) => {
  const { page = 1, limit = 10, boardId } = req.query
  const startIndex = (page - 1) * limit

  try {
    const query = boardId ? { board: boardId } : {}

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))

    res.status(200).json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get posts' })
  }
}

export const getPostById = async (req, res) => {
  const { id } = req.params

  try {
    const post = await Post.findById(id)
      .populate('user', 'username')
      .populate('board', 'title description')

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.status(200).json(post)
  } catch (error) {
    console.error('Error getting post by ID:', error)
    res.status(500).json({ error: 'Failed to get post by ID' })
  }
}

export const getPostsByBoard = async (req, res) => {
  const { boardId } = req.params
  const { page = 1, limit = 10 } = req.query
  const startIndex = (page - 1) * limit

  try {
    const board = await Board.findById(boardId)
    if (!board) return res.status(404).json({ error: 'Board not found' })

    const posts = await Post.find({ board: boardId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))

    res.status(200).json(posts)
  } catch (error) {
    console.error('Error getting posts by board:', error)
    res.status(500).json({ error: 'Failed to get posts by board' })
  }
}
