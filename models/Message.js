import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

export default mongoose.model('Message', messageSchema)