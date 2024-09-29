// models/Downvote.js

import mongoose from 'mongoose';

const DownvoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DownvoteSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.model('Downvote', DownvoteSchema);