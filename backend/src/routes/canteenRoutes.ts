import { Router } from 'express';
import { getDb } from '../db.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';
import { getRedis } from '../config/redis.js';

const router = Router();

// In-memory instant L1 cache with TTL to eliminate Redis network roundtrips during bursts
const localCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getCached<T>(key: string): Promise<T | null> {
  // 1. Instant L1 memory check (0.01ms)
  const memoryItem = localCache.get(key);
  if (memoryItem && memoryItem.expiry > Date.now()) {
    return memoryItem.data as T;
  }

  // 2. Redis L2 check
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      localCache.set(key, { data: parsed, expiry: Date.now() + CACHE_TTL_MS });
      return parsed;
    }
  } catch {
    // Redis unavailable, fallback to DB
  }
  return null;
}

async function setCached(key: string, data: any): Promise<void> {
  localCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
  try {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(data), 'EX', 600);
  } catch {
    // Redis write failure gracefully bypassed
  }
}

router.get('/', asyncErrorWrapper(async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');

  const cacheKey = 'canteen:list:all';
  const cached = await getCached<any[]>(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  const db = await getDb();
  const result = await db.query('SELECT * FROM canteen ORDER BY group_name ASC, name ASC');
  await setCached(cacheKey, result.rows);
  res.status(200).json(result.rows);
}));

router.get('/by-slug/:slug', asyncErrorWrapper(async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  const { slug } = req.params;
  const cacheKey = `canteen:by-slug:${slug.toLowerCase()}`;

  const cached = await getCached<any>(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  const db = await getDb();
  
  // Look up by canteen slug, id, group_slug, or group_name
  const canteenRes = await db.query(
    'SELECT * FROM canteen WHERE slug = $1 OR id = $1 OR group_slug = $1 OR LOWER(group_name) = LOWER($1) OR LOWER(name) = LOWER($1) ORDER BY name ASC',
    [slug]
  );
  
  if (canteenRes.rows.length === 0) {
    return res.status(404).json({ error: 'Campus or canteen not found' });
  }

  const rows = canteenRes.rows;
  let canteen = rows[0];
  let sisterCanteens: any[] = [];

  // If the query matched a group_slug or group_name, all matched canteens are sister canteens
  if (rows.length > 1) {
    sisterCanteens = rows;
  } else if (canteen.group_name) {
    const sistersRes = await db.query('SELECT * FROM canteen WHERE group_name = $1 ORDER BY name ASC', [canteen.group_name]);
    sisterCanteens = sistersRes.rows;
  } else {
    sisterCanteens = [canteen];
  }

  const payload = { canteen, sisterCanteens };
  await setCached(cacheKey, payload);
  res.status(200).json(payload);
}));

export default router;
