// config/logger.js
import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const { combine, timestamp, printf, errors, json, colorize } = format;

// Define your custom format
const customFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }), // Capture stack traces
  json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: customFormat,
  defaultMeta: { service: 'user-service' },
  transports: [
    // Log errors to error.log file
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Log all levels to combined.log file
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  });

  logger.add(
    new transports.Console({
      format: combine(colorize(), consoleFormat),
    })
  );
}

export default logger;