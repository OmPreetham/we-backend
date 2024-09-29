// models/Bookmark.js

import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
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

// Prevent duplicate bookmarks by the same user on the same post
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.model('Bookmark', bookmarkSchema);