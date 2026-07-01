import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { config } from '../config/unifiedConfig.js';

// Initialize Sentry if DSN is provided
if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    tracesSampleRate: 1.0,
  });
}

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Capture exception in Sentry
  if (config.sentry.dsn) {
    Sentry.captureException(err);
  } else {
    // Log to console locally
    console.error(`[Error Handler]:`, err);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
