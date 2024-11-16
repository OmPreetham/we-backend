import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinaryConfig.js';

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posts', // The folder in Cloudinary where images will be stored
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'], // Allowed formats
  },
});

// Create multer instance
const upload = multer({ storage: storage });

export default upload; 