import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './config/unifiedConfig.js';

let pool: pg.Pool | null = null;

export async function getDb(): Promise<pg.Pool> {
  if (pool) return pool;

  const dbConfig = config.db;
  if (dbConfig.connectionString) {
    pool = new pg.Pool({
      connectionString: dbConfig.connectionString,
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
      image TEXT
    )
  `);

  // Create users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      canteen_id TEXT REFERENCES canteen(id)
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
  } catch (e) {
    console.log('Could not alter orders table (might already have canteen_id or using sqlite fallback)');
  }

  // Seed initial canteens
  // Seed initial canteens
  const canteens = [
    { id: 'c1', name: 'Canteen A', description: 'Independent student dining hall serving full meals, snacks, and drinks.', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=60' },
    { id: 'c2', name: 'Canteen B', description: 'Self-contained student canteen with its own custom kitchen and menu.', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=60' },
    { id: 'c3', name: 'Canteen C', description: 'Separate dining lounge offering independent meals, beverages, and desserts.', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=150&auto=format&fit=crop&q=60' },
    { id: 'c4', name: 'Canteen D', description: 'Independent dining pavilion serving a full variety of dishes and quick bites.', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=150&auto=format&fit=crop&q=60' }
  ];
  for (const c of canteens) {
    await db.query(
      `INSERT INTO canteen (id, name, description, image) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image = EXCLUDED.image`,
      [c.id, c.name, c.description, c.image]
    );
  }
  console.log('Database seeded with generic canteens.');

  // Seed initial users - Wipe old users first to prevent duplicates
  await db.query('DELETE FROM users');
  const users = [
    { id: 'u1', username: 'admin', password: 'adminpassword', role: 'admin', canteen_id: null },
    { id: 'u2', username: 'canteen_a_mgr', password: '1234', role: 'manager', canteen_id: 'c1' },
    { id: 'u3', username: 'canteen_a_cook', password: '1234', role: 'cook', canteen_id: 'c1' },
    { id: 'u4', username: 'canteen_b_mgr', password: '1234', role: 'manager', canteen_id: 'c2' },
    { id: 'u5', username: 'canteen_b_cook', password: '1234', role: 'cook', canteen_id: 'c2' },
    { id: 'u6', username: 'canteen_c_mgr', password: '1234', role: 'manager', canteen_id: 'c3' },
    { id: 'u7', username: 'canteen_c_cook', password: '1234', role: 'cook', canteen_id: 'c3' },
    { id: 'u8', username: 'canteen_d_mgr', password: '1234', role: 'manager', canteen_id: 'c4' },
    { id: 'u9', username: 'canteen_d_cook', password: '1234', role: 'cook', canteen_id: 'c4' }
  ];
  for (const u of users) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    await db.query(
      'INSERT INTO users (id, username, password_hash, role, canteen_id) VALUES ($1, $2, $3, $4, $5)',
      [u.id, u.username, passwordHash, u.role, u.canteen_id]
    );
  }
  console.log('Database seeded with simplified staff users.');

  // Seed initial menu if empty
  const countRes = await db.query('SELECT COUNT(*) as count FROM menu');
  const count = parseInt(countRes.rows[0].count, 10);
  const initialItems = [
    { id: 'm1', name: 'Paneer Tikka Roll', price: 80.0, category: 'Snacks', is_available: 1, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdNAZ_e2m0yqXsZvaM9uCWInUbKAubuRRtdg8KN9wxkW5wXsD8k5FRG-a5He3EQCZOZMyvWhADcvcVfx4mVmGq-06TkQAuioN1bndgdzjNWFQEPIbaE4CrAaGrh24VQ1yO7fYsOb9gZd4F9YBYjYTkvADAT6gUog0-IbUIm_TQAakxeWhuqDvyuVSYMRTZBBUZWtV8v_UrpltU--SP3qTdnj-qhn5scMhuv1DKf_58XyvuCMu87N3n13MTRvAcn4RzTs5eo-pYUAA', canteen_id: 'c1' },
    { id: 'm2', name: 'Cold Coffee', price: 50.0, category: 'Beverages', is_available: 1, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDX09sqX58p13TXbkqe_JuR7otpbvEO5C1CrwLJqL_ttaEghV-Kc53IdhHE3VvQUdcAnEijChm-djT6JuI9QYTee2iBPA6M3schOmxTIforoczMF5AmHFF-MAMWtsZk_mCSTchFWTwo5YKtN6jKhEXrIOsdIEIcL81u45Knkn1IwKsmh8wNUz2CvAeLiTVIM1_yB0JOXgjrPlP3QgjM1QIU-LN8vYOGhnPavmDANuIaEQrpZA7vmOoMMxPvnDodPFaITLY-m_ZxY5I', canteen_id: 'c2' },
    { id: 'm3', name: 'Cheese Veg Burger', price: 70.0, category: 'Snacks', is_available: 1, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFotwugAGXMSfPMNergZSkElO8zPYngS5-dix215gq--vzUlJ13utSjX5h_9wuYgXMLR4pvRgdZz3YhddTdBzLIwzzJeMcKMORDZFx8nzX3-W_cLSUlBuMv8nYWF7Rbp5UYveh52JEiyeTVNmxmKuzesqd6cMwqdvKp6LS1W3HDqP_jF0iVEDYBcG9BxzYvwo9hSAyM6ohxAtkKcVxfhmVCqI7nVf3OXFW2aCgCEKecCtMJBH7i1-uIlQ8ZksofGbbesOTmSuGGa8', canteen_id: 'c1' },
    { id: 'm4', name: 'Masala Dosa', price: 60.0, category: 'Meals', is_available: 1, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDl7xfKP3AEX9uh0-7Li6Eq4OL1m3-UckfTkzwMX50pmmNaZ5gN43V_mzLBEMaWuj0xm6Q53TqrWOnUzLSzPeGXsPBosAvf2ZLXaKEaHM438teE9jC422ox6CGge36EAicsD3nV8QwErObDNKQDZhorpKf62ohWNiHw2qw_cngVJqLEo4mA5h-QgM8R3VuUhaqxe-YcJKM1-755nznGdQjPMIAyGsq4lubwXaabVPf31h1_j0TMBR6RzJXlmKrPUwAVXX28BagvDo', canteen_id: 'c4' },
    { id: 'm5', name: 'Samosa (2 pcs)', price: 20.0, category: 'Snacks', is_available: 1, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlHShZyIr9BX2BZIJzAMzUyNd_Q296o275L3NlA8ClEFUefrot8ycvrUPECUu_4DrazdekwBU_VRlB-y3ufRLv-r8wSPZngd4LgkGFvkxdPmlLhwavugVBBvyP9_hqUTX_WLzz8qWUPRjHUDyImXEoSZQxF1giZ-pHGWTxMJuUscKkGPIq7fPtX2oCTrr7ccwFG7D46TTtDjMtVn1BaJU3cmCQDhU_ZnMxmFKIIgTAg-CWAC3uIGqoB-q8JpCi7R63wfxWP56gnW4', canteen_id: 'c1' },
    { id: 'm6', name: 'French Fries', price: 55.0, category: 'Snacks', is_available: 1, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAB3TTBoiGwnHWphH0hC6HciNZ7AgZ4S2gjD1QfqeTOWHtLa-07S49N818Y2bnhRSo8btHh_V6JaFIgsb45jllGG4xhXpC48Px3yxNKhiaOWn1R1PKIgJizFqw8j-aljJPNPlIZlPjzA2cFaOFTJE0WEKS1FkZWhiWJ-e3iFsp8JAUXPoVElmwYP7AjkDlo06aThkOn0NPXwiMC-cVB9_UqFGPdlsXhxlq930ohMNS79GIvjMKPXt0QuDAkDkOBAMje3r4KEXPjF7M', canteen_id: 'c1' },
    { id: 'm7', name: 'Mango Lassi', price: 40.0, category: 'Beverages', is_available: 1, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=150&auto=format&fit=crop&q=60', canteen_id: 'c3' },
    { id: 'm8', name: 'Chocolate Brownie', price: 45.0, category: 'Desserts', is_available: 1, image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=150&auto=format&fit=crop&q=60', canteen_id: 'c2' }
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
