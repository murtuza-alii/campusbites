import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './config/unifiedConfig.js';

let pool: pg.Pool | null = null;

export async function getDb(): Promise<pg.Pool> {
  if (pool) return pool;

  const dbConfig = config.db;
  if (dbConfig.connectionString) {
    const isLocal = dbConfig.connectionString.includes('localhost') || dbConfig.connectionString.includes('127.0.0.1');
    pool = new pg.Pool({
      connectionString: dbConfig.connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  } else {
    pool = new pg.Pool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
    });
  }

  // Verify connection
  try {
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL connection pool established successfully.');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }

  return pool;
}

export async function initDb(): Promise<void> {
  const db = await getDb();

  // Create canteen table
  await db.query(`
    CREATE TABLE IF NOT EXISTS canteen (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      slug TEXT UNIQUE,
      group_name TEXT
    )
  `);

  // Create users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      pin_hash TEXT,
      role TEXT NOT NULL,
      canteen_id TEXT REFERENCES canteen(id),
      display_name TEXT NOT NULL DEFAULT 'Staff Member',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create menu table
  await db.query(`
    CREATE TABLE IF NOT EXISTS menu (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      category TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      image TEXT,
      canteen_id TEXT REFERENCES canteen(id)
    )
  `);

  // Create orders table
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      student_roll TEXT NOT NULL,
      items TEXT NOT NULL,
      total_price DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL,
      pickup_code TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      canteen_id TEXT REFERENCES canteen(id)
    )
  `);

  // Alter tables to add canteen_id column if they existed before without it
  try {
    await db.query('ALTER TABLE menu ADD COLUMN IF NOT EXISTS canteen_id TEXT REFERENCES canteen(id)');
  } catch (e) {
    console.log('Could not alter menu table (might already have canteen_id or using sqlite fallback)');
  }

  try {
    await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS canteen_id TEXT REFERENCES canteen(id)');
    await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT \'PAID\'');
    await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_session_id TEXT');
    await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS cf_order_id TEXT');
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_canteen_status ON orders (canteen_id, status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_student_roll ON orders (student_roll)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders (pickup_code)');
  } catch (e) {
    console.log('Could not alter orders table or create indexes');
  }


  const userAlterQueries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT \'Staff Member\'',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    'ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_users_canteen_role ON users(canteen_id, role)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
  ];

  for (const q of userAlterQueries) {
    try {
      await db.query(q);
    } catch (e) {
      // ignore if already present or applied
    }
  }

  // Create restaurant partner registrations table
  await db.query(`
    CREATE TABLE IF NOT EXISTS restaurant_registrations (
      id TEXT PRIMARY KEY,
      restaurant_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      campus_name TEXT NOT NULL,
      city TEXT,
      daily_orders_capacity INTEGER,
      status TEXT DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.query('ALTER TABLE canteen ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE');
    await db.query('ALTER TABLE canteen ADD COLUMN IF NOT EXISTS group_name TEXT');
    await db.query('ALTER TABLE canteen ADD COLUMN IF NOT EXISTS group_slug TEXT');
  } catch (e) {
    console.log('Could not alter canteen table for slug, group_name, and group_slug');
  }

  // Seed initial canteens for Mithibai Main Campus and Standalone Diners
  const canteens = [
    { 
      id: 'c1', 
      name: 'Canteen A', 
      slug: 'mithibai-canteen-a', 
      group_name: 'Mithibai Main Campus', 
      group_slug: 'mithibai-main-campus', 
      description: 'Mithibai College South Wing student dining hall serving full meals, snacks, and drinks.', 
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=60' 
    },
    { 
      id: 'c2', 
      name: 'Canteen B', 
      slug: 'mithibai-canteen-b', 
      group_name: 'Mithibai Main Campus', 
      group_slug: 'mithibai-main-campus', 
      description: 'Mithibai Central student cafeteria with quick bites, beverages, and custom kitchen.', 
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=60' 
    },
    { 
      id: 'c3', 
      name: 'Canteen C', 
      slug: 'mithibai-canteen-c', 
      group_name: 'Mithibai Main Campus', 
      group_slug: 'mithibai-main-campus', 
      description: 'Mithibai College Terrace lounge offering independent meals, beverages, and desserts.', 
      image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=150&auto=format&fit=crop&q=60' 
    },
    { 
      id: 'c4', 
      name: 'Canteen D', 
      slug: 'mithibai-canteen-d', 
      group_name: 'Mithibai Main Campus', 
      group_slug: 'mithibai-main-campus', 
      description: 'Mithibai Ground Pavilion serving fresh thalis, sandwiches, and quick bites.', 
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=150&auto=format&fit=crop&q=60' 
    },
    { 
      id: 'c5', 
      name: 'Downtown Diner', 
      slug: 'downtown-diner', 
      group_name: null, 
      group_slug: null, 
      description: 'Standalone premium gourmet diner with fresh meals made to order.', 
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=60' 
    },
    { 
      id: 'c6', 
      name: 'Anand Stall (Fast Food & Juice Centre)', 
      slug: 'anand-stall', 
      group_name: null, 
      group_slug: null, 
      description: 'Legendary Mumbai fast food & juice centre since 1978. Famous for buttery vada pavs, jinny & matka dosas, gourmet grill sandwiches & fresh fruit blossoms.', 
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=150&auto=format&fit=crop&q=60' 
    }
  ];
  for (const c of canteens) {
    await db.query(
      `INSERT INTO canteen (id, name, slug, group_name, group_slug, description, image) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, group_name = EXCLUDED.group_name, group_slug = EXCLUDED.group_slug, description = EXCLUDED.description, image = EXCLUDED.image`,
      [c.id, c.name, c.slug, c.group_name, c.group_slug, c.description, c.image]
    );
  }
  console.log('Database seeded with Mithibai Main Campus canteens and standalone diner.');

  // Seed initial users with roles, emails, passwords, and cook PINs
  const users = [
    { 
      id: 'u1', 
      username: 'admin', 
      email: 'admin@campusbites.com', 
      password: 'adminpassword', 
      pin: null, 
      role: 'admin', 
      canteen_id: null, 
      display_name: 'Platform Administrator' 
    },
    { 
      id: 'u2', 
      username: 'canteen_a_mgr', 
      email: 'manager@heritage50.com', 
      password: 'manager123', 
      pin: null, 
      role: 'manager', 
      canteen_id: 'c1', 
      display_name: 'Store Manager (Lead)' 
    },
    { 
      id: 'u3', 
      username: 'canteen_a_cook', 
      email: null, 
      password: null, 
      pin: 'CHEF50', 
      role: 'cook', 
      canteen_id: 'c1', 
      display_name: 'Chef Ramesh (Master Cook)' 
    },
    { 
      id: 'u4', 
      username: 'canteen_b_mgr', 
      email: 'manager_b@campusbites.com', 
      password: 'manager123', 
      pin: null, 
      role: 'manager', 
      canteen_id: 'c2', 
      display_name: 'Canteen B Manager' 
    },
    { 
      id: 'u5', 
      username: 'canteen_b_cook', 
      email: null, 
      password: null, 
      pin: 'COOKB2', 
      role: 'cook', 
      canteen_id: 'c2', 
      display_name: 'Chef Suresh' 
    },
    { 
      id: 'u6', 
      username: 'canteen_c_mgr', 
      email: 'manager_c@campusbites.com', 
      password: 'manager123', 
      pin: null, 
      role: 'manager', 
      canteen_id: 'c3', 
      display_name: 'Canteen C Manager' 
    },
    { 
      id: 'u7', 
      username: 'canteen_c_cook', 
      email: null, 
      password: null, 
      pin: 'COOKC3', 
      role: 'cook', 
      canteen_id: 'c3', 
      display_name: 'Chef Amit' 
    },
    { 
      id: 'u8', 
      username: 'canteen_d_mgr', 
      email: 'manager_d@campusbites.com', 
      password: 'manager123', 
      pin: null, 
      role: 'manager', 
      canteen_id: 'c4', 
      display_name: 'Canteen D Manager' 
    },
    { 
      id: 'u9', 
      username: 'canteen_d_cook', 
      email: null, 
      password: null, 
      pin: 'COOKD4', 
      role: 'cook', 
      canteen_id: 'c4', 
      display_name: 'Chef Vijay' 
    },
    { 
      id: 'u10', 
      username: 'downtown_diner_mgr', 
      email: 'manager@downtowndiner.com', 
      password: 'manager123', 
      pin: null, 
      role: 'manager', 
      canteen_id: 'c5', 
      display_name: 'Downtown Diner Manager' 
    },
    { 
      id: 'u11', 
      username: 'downtown_diner_cook', 
      email: null, 
      password: null, 
      pin: 'DINER5', 
      role: 'cook', 
      canteen_id: 'c5', 
      display_name: 'Chef Rajesh' 
    },
    { 
      id: 'u12', 
      username: 'canteen_a_delivery', 
      email: null, 
      password: null, 
      pin: 'DELIV1', 
      role: 'delivery', 
      canteen_id: 'c1', 
      display_name: 'Raju (Delivery Agent)' 
    },
    { 
      id: 'u13', 
      username: 'downtown_diner_delivery', 
      email: null, 
      password: null, 
      pin: 'DELIV5', 
      role: 'delivery', 
      canteen_id: 'c5', 
      display_name: 'Vikas (Express Delivery)' 
    },
    { 
      id: 'u14', 
      username: 'anand_stall_mgr', 
      email: 'manager@anandstall.com', 
      password: 'manager123', 
      pin: null, 
      role: 'manager', 
      canteen_id: 'c6', 
      display_name: 'Anand Stall Store Manager' 
    },
    { 
      id: 'u15', 
      username: 'anand_stall_cook', 
      email: null, 
      password: null, 
      pin: 'ANAND1', 
      role: 'cook', 
      canteen_id: 'c6', 
      display_name: 'Chef Anand (Master Cook)' 
    },
    { 
      id: 'u16', 
      username: 'anand_stall_delivery', 
      email: null, 
      password: null, 
      pin: 'ANDEL1', 
      role: 'delivery', 
      canteen_id: 'c6', 
      display_name: 'Anand Express Delivery Agent' 
    }
  ];

  for (const u of users) {
    const passwordHash = u.password ? bcrypt.hashSync(u.password, 10) : null;
    const pinHash = u.pin ? bcrypt.hashSync(u.pin, 10) : null;
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, pin_hash, role, canteen_id, display_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET 
         username = EXCLUDED.username,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         pin_hash = EXCLUDED.pin_hash,
         role = EXCLUDED.role,
         canteen_id = EXCLUDED.canteen_id,
         display_name = EXCLUDED.display_name,
         updated_at = NOW()`,
      [u.id, u.username, u.email, passwordHash, pinHash, u.role, u.canteen_id, u.display_name]
    );
  }
  console.log('Database seeded with enhanced multi-tier role users (Cook PINs & Manager/Admin Passwords).');

  // Seed initial menu if empty
  const countRes = await db.query('SELECT COUNT(*) as count FROM menu');
  const count = parseInt(countRes.rows[0].count, 10);
  const initialItems = [
    { id: 'm1', name: 'Paneer Tikka Roll', price: 80.0, category: 'Snacks', is_available: 1, image: null, canteen_id: 'c1' },
    { id: 'm2', name: 'Cold Coffee', price: 50.0, category: 'Beverages', is_available: 1, image: null, canteen_id: 'c2' },
    { id: 'm3', name: 'Cheese Veg Burger', price: 70.0, category: 'Snacks', is_available: 1, image: null, canteen_id: 'c1' },
    { id: 'm4', name: 'Masala Dosa', price: 60.0, category: 'Meals', is_available: 1, image: null, canteen_id: 'c4' },
    { id: 'm5', name: 'Samosa (2 pcs)', price: 20.0, category: 'Snacks', is_available: 1, image: null, canteen_id: 'c1' },
    { id: 'm6', name: 'French Fries', price: 55.0, category: 'Snacks', is_available: 1, image: null, canteen_id: 'c1' },
    { id: 'm7', name: 'Mango Lassi', price: 40.0, category: 'Beverages', is_available: 1, image: null, canteen_id: 'c3' },
    { id: 'm8', name: 'Chocolate Brownie', price: 45.0, category: 'Desserts', is_available: 1, image: null, canteen_id: 'c2' }
  ];

  if (count === 0) {
    for (const item of initialItems) {
      await db.query(
        'INSERT INTO menu (id, name, price, category, is_available, image, canteen_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [item.id, item.name, item.price, item.category, item.is_available, item.image, item.canteen_id]
      );
    }
    console.log('Database seeded with initial menu items.');
  } else {
    for (const item of initialItems) {
      await db.query(
        'UPDATE menu SET image = $1, canteen_id = $2 WHERE id = $3',
        [item.image, item.canteen_id, item.id]
      );
    }
    console.log('Database menu items updated with canteen associations.');
  }
}
