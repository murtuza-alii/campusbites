import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { getRedis } from '../config/redis.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    const db = await getDb();
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
  } catch (error: any) {
    dbStatus = `unhealthy (${error.message || 'connection failed'})`;
  }

  let redisStatus = 'healthy';
  let redisLatencyMs = 0;
  try {
    const redisStart = Date.now();
    const redis = getRedis();
    await redis.ping();
    redisLatencyMs = Date.now() - redisStart;
  } catch (error: any) {
    redisStatus = `unhealthy (${error.message || 'connection failed'})`;
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  const isDegraded = dbStatus.startsWith('unhealthy') || redisStatus.startsWith('unhealthy');

  const healthPayload = {
    status: isDegraded ? 'degraded' : 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    uptimeSeconds,
    responseTimeMs: Date.now() - startTime,
    checks: {
      database: { status: dbStatus, latencyMs: dbLatencyMs },
      redis: { status: redisStatus, latencyMs: redisLatencyMs },
    },
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    environment: process.env.NODE_ENV || 'production',
  };

  res.status(isDegraded ? 503 : 200).json(healthPayload);
});

export default router;
