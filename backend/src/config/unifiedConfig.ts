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
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    staffPassword: env.STAFF_PASSWORD,
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

