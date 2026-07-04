import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import canteenRoutes from './routes/canteenRoutes.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

const app = express();

// Apply security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Limit requests to prevent brute force / DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Parse JSON request bodies
app.use(express.json());

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/canteens', canteenRoutes);

// Centralized error handler
app.use(errorMiddleware);

export default app;
