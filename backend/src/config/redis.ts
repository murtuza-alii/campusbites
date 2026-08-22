import { Redis, RedisOptions } from 'ioredis';
import { config } from './unifiedConfig.js';

let redisInstance: Redis | null = null;

export let redisConnectionOptions: RedisOptions = {};

// Clean the Redis URL of any surrounding quotes
const rawUrl = config.redis.url ? config.redis.url.replace(/^["']|["']$/g, '') : undefined;

if (rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    redisConnectionOptions = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy(times) {
        if (times > 3) {
          return 30000; // Backoff to 30s after 3 failed attempts
        }
        return Math.min(times * 1000, 3000);
      },
    };
    
    // For Upstash rediss:// connections, we need tls options
    if (rawUrl.startsWith('rediss://')) {
      redisConnectionOptions.tls = { rejectUnauthorized: false };
    }
  } catch (e) {
    console.error('Failed to parse REDIS_URL, falling back to host/port:', e);
    redisConnectionOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 3) return 30000;
        return Math.min(times * 1000, 3000);
      },
    };
  }
} else {
  redisConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 3) return 30000;
      return Math.min(times * 1000, 3000);
    },
  };
}

export function getRedis(): Redis {
  if (redisInstance) return redisInstance;

  // ioredis accepts connection options
  redisInstance = new Redis(redisConnectionOptions);

  redisInstance.on('connect', () => {
    console.log('Redis client connected successfully.');
  });

  redisInstance.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  return redisInstance;
}
