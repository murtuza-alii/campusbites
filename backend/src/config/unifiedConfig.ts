import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(5000),
  JWT_SECRET: z.string().default('fallback_secret_for_canteen_app'),
  STAFF_PASSWORD: z.string().default('admin123'),
  SENTRY_DSN: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default('localhost'),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PGDATABASE: z.string().default('campusbites'),
  PGPORT: z.coerce.number().default(5432),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  CASHFREE_APP_ID: z.string().default(''),
  CASHFREE_SECRET_KEY: z.string().default(''),
  CASHFREE_ENV: z.enum(['TEST', 'PROD']).default('TEST'),
  CASHFREE_API_VERSION: z.string().default('2023-08-01'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuration validation error:', parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  server: {
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    staffPassword: env.STAFF_PASSWORD,
  },
  cashfree: {
    appId: env.CASHFREE_APP_ID,
    secretKey: env.CASHFREE_SECRET_KEY,
    env: env.CASHFREE_ENV,
    apiVersion: env.CASHFREE_API_VERSION,
    baseUrl: env.CASHFREE_ENV === 'PROD' 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg',
  },
  sentry: {
    dsn: env.SENTRY_DSN,
  },
  db: {
    connectionString: env.DATABASE_URL,
    host: env.PGHOST,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    port: env.PGPORT,
  },
  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
  }
};


