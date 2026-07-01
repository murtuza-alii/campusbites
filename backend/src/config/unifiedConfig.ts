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
    filename: path.join(__dirname, '../../canteen.db'),
  }
};
