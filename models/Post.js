import mongoose from 'mongoose'

const PostSchema = new mongoose.Schema({
  content: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  parentPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null,
  },
  path: { type: String, default: ',' },
  upvoteCount: { type: Number, default: 0 },
  downvoteCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
})

export default mongoose.model('Post', PostSchema)
