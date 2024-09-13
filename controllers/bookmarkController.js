import Bookmark from '../models/Bookmark.js'
import Post from '../models/Post.js'
import redisClient from '../config/redisClient.js'

export const bookmarkPost = async (req, res) => {
  const { id } = req.params

  try {
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const existingBookmark = await Bookmark.findOne({
      user: req.user.userId,
      post: id,
    })
    if (existingBookmark) {
      await existingBookmark.deleteOne()
      await redisClient.del(
        `user:${req.user.userId.toString()}:bookmarkedPosts`
      )
      return res.status(200).json({ message: 'Post removed from bookmarks' })
    }

    const newBookmark = new Bookmark({
      user: req.user.userId,
      post: id,
    })
    await newBookmark.save()

    await redisClient.del(`user:${req.user.userId.toString()}:bookmarkedPosts`)
    res.status(200).json({ message: 'Post bookmarked successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Error bookmarking post' })
  }
}

export const getBookmarkedPosts = async (req, res) => {
  const cacheKey = `user:${req.user.userId.toString()}:bookmarkedPosts`

  try {
    const cachedBookmarkedPosts = await redisClient.get(cacheKey)
    if (cachedBookmarkedPosts)
      return res.status(200).json(JSON.parse(cachedBookmarkedPosts))

    const bookmarks = await Bookmark.find({ user: req.user.userId }).populate(
      'post'
    )
    const bookmarkedPosts = bookmarks.map((bookmark) => bookmark.post)

    await redisClient.set(cacheKey, JSON.stringify(bookmarkedPosts), {
      EX: 3600,
    })

    res.status(200).json(bookmarkedPosts)
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving bookmarked posts' })
  }
}
