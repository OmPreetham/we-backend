import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  },
  { timestamps: true }
);

followSchema.index({ user: 1, board: 1 }, { unique: true });
followSchema.index({ user: 1 });
followSchema.index({ board: 1 });

export default mongoose.model('Follow', followSchema);