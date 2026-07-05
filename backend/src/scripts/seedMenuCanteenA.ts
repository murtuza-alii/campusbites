import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Redis } from 'ioredis';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CANTEEN_ID = 'c1'; // Canteen A

const categoryImages: Record<string, string> = {
  "Pav Bhaji": "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60",
  "South Indian & Dosas": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60",
  "Sandwiches & Frankies": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=60",
  "Chinese (Starters & Mains)": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60",
  "Pizza, Burgers & Pasta": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60",
  "Chaat & Potato Specialists": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=60",
  "Indian Meals & Thalis": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60",
  "Fresh Juices & Hot Beverages": "https://images.unsplash.com/photo-1536882240095-0379873feb4e?w=500&auto=format&fit=crop&q=60",
  "Lassis, Milk Shakes & Desserts": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60"
};

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  // Read canteen_menu.json
  const menuPath = path.resolve(process.cwd(), '../canteen_menu.json');
  if (!fs.existsSync(menuPath)) {
    console.error(`Menu file not found at ${menuPath}`);
    process.exit(1);
  }

  let menuData;
  try {
    menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  } catch (err) {
    console.error('Error parsing canteen_menu.json:', err);
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  
  try {
    const client = await pool.connect();
    console.log('Connected to Supabase PostgreSQL Database.');

    // Ensure Canteen A exists
    const canteenRes = await client.query('SELECT * FROM canteen WHERE id = $1', [CANTEEN_ID]);
    if (canteenRes.rowCount === 0) {
      console.log(`Canteen with ID "${CANTEEN_ID}" not found. Inserting default Canteen A.`);
      await client.query(
        `INSERT INTO canteen (id, name, description, image) 
         VALUES ($1, 'Canteen A', 'Main food court and meal counter.', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=60')`,
        [CANTEEN_ID]
      );
    }

    // Delete existing menu items for Canteen A
    console.log('Clearing existing menu items for Canteen A...');
    await client.query('DELETE FROM menu WHERE canteen_id = $1', [CANTEEN_ID]);

    // Insert new menu items
    console.log('Feeding new clustered menu items into database...');
    let insertedCount = 0;
    
    // Start transaction
    await client.query('BEGIN');

    for (const category of menuData.categories) {
      const categoryName = category.name;
      const imageUrl = categoryImages[categoryName] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      
      console.log(`Inserting category "${categoryName}" (${category.items.length} items)...`);
      
      for (let i = 0; i < category.items.length; i++) {
        const item = category.items[i];
        
        // Generate a clean unique ID for the menu item
        // e.g. m_c1_south_indian_dosas_1
        const cleanCategorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        const itemId = `m_c1_${cleanCategorySlug}_${i + 1}`;
        
        await client.query(
          `INSERT INTO menu (id, name, price, category, is_available, image, canteen_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [itemId, item.name, item.price, categoryName, 1, null, CANTEEN_ID]
        );
        insertedCount++;
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log(`\nSuccessfully seeded ${insertedCount} menu items for Canteen A in Supabase!`);

    // Invalidate Redis cache for Canteen A
    const rawRedisUrl = process.env.REDIS_URL;
    if (rawRedisUrl) {
      console.log('Invalidating Redis menu cache...');
      const cleanedRedisUrl = rawRedisUrl.replace(/^["']|["']$/g, '');
      const parsedRedis = new URL(cleanedRedisUrl);
      const redisOptions: any = {
        host: parsedRedis.hostname,
        port: parsedRedis.port ? parseInt(parsedRedis.port, 10) : 6379,
        username: parsedRedis.username || undefined,
        password: parsedRedis.password ? decodeURIComponent(parsedRedis.password) : undefined,
      };
      if (cleanedRedisUrl.startsWith('rediss://')) {
        redisOptions.tls = { rejectUnauthorized: false };
      }
      const redis = new Redis(redisOptions);
      try {
        const keys = await redis.keys('canteen:menu:*');
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        console.log('Redis cache successfully invalidated.');
      } catch (redisErr) {
        console.error('Failed to invalidate Redis cache:', redisErr);
      } finally {
        redis.disconnect();
      }
    }

    client.release();
  } catch (err) {
    console.error('Error seeding menu items:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
