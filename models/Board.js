import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Board title is required'],
      trim: true,
      maxlength: [100, 'Board title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Board description is required'],
      trim: true,
      maxlength: [500, 'Board description cannot exceed 500 characters'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    symbolColor: {
      type: String,
      required: true,
      default: '#000000', // Set a default color, can be any hex code or color representation
    },
    systemImageName: {
      type: String,
      required: true,
      trim: true,
      default: 'star', // Example default system image name
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

export default mongoose.model('Board', boardSchema);