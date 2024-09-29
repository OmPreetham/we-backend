// app.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import logger from './config/logger.js';
import redisClient from './config/redisClient.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import boardRouter from './routes/boardRoutes.js';
import postsRouter from './routes/postRoutes.js';

dotenv.config();

const app = express();

// Security middlewares
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5500',
    credentials: true,
  })
);

// Body parser and cookie parser
app.use(express.json());
app.use(cookieParser());

// HTTP request logging with Morgan integrated with Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

app.use(morgan('combined', { stream }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRoutes);
app.use('/api/boards', boardRouter);
app.use('/api/posts', postsRouter);

// Health check route
app.get('/', (req, res) => {
  res.send('Hello, We!');
});

// Error handling middleware
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception: %o', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: %o, reason: %o', promise, reason);
  process.exit(1);
});

// Function to wait for Redis client to be ready
const waitForRedisReady = () => {
  return new Promise((resolve, reject) => {
    if (redisClient.status === 'ready') {
      logger.info('Redis client is already ready');
      resolve();
    } else {
      redisClient.once('ready', () => {
        logger.info('Connected to Redis');
        resolve();
      });
      redisClient.once('error', (err) => {
        logger.error('Redis error: %o', err);
        reject(err);
      });
    }
  });
};

// Start the server after Redis and MongoDB are ready
const startServer = async () => {
  try {
    // Wait for both MongoDB and Redis to be ready
    await Promise.all([
      connectDB().then(() => logger.info('Connected to MongoDB')),
      waitForRedisReady(),
    ]);

    const PORT = process.env.PORT || 5500;
    app.listen(PORT, () => {
      logger.info(`Server running on PORT: ${PORT}`);
    });
  } catch (error) {
    logger.error('Error starting server: %o', error);
    process.exit(1);
  }
};

startServer();

export default app;