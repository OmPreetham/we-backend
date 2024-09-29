// models/Upvote.js

import mongoose from 'mongoose';

const UpvoteSchema = new mongoose.Schema(
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

UpvoteSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.model('Upvote', UpvoteSchema);