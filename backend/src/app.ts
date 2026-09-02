import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import canteenRoutes from './routes/canteenRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

const app = express();
 
// Trust reverse proxy (Render / Cloudflare) for accurate client identification
app.set('trust proxy', 1);

// Enable HTTP Gzip / Brotli compression (>1KB payloads compressed by ~80%)
app.use(compression({
  threshold: 1024,
  level: 6
}));

// Apply security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable CORS
app.use(cors());

// Dedicated healthcheck endpoints (exempt from rate limiter for keepalive & monitoring)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// 🌐 1. Campus-Wide Wi-Fi Friendly General API Limiter (Accommodates 1,000+ students on shared NAT IP)
const campusApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15000, // High capacity for college Wi-Fi subnets
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Campus network traffic limit reached. Please try again shortly.' }
});
app.use('/api', campusApiLimiter);

// 🔒 2. Strict Auth Limiter (Prevents brute-force on staff/admin passwords & PINs)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth', authLimiter);

// 💳 3. Payment Gateway Order Creation Limiter
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Payment gateway is busy processing orders. Please retry in a few seconds.' }
});
app.use('/api/payments/create-order', paymentLimiter);

// Parse JSON request bodies
app.use(express.json());

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/canteens', canteenRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/payments', paymentRoutes);

// Centralized error handler
app.use(errorMiddleware);

export default app;
