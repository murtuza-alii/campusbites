import { getDb, initDb } from '../db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';

// Image mapping helper for categories and items
function getItemImage(name: string, category: string): string {
  const lower = name.toLowerCase();
  
  if (lower.includes('vada pav') || lower.includes('samosa pav')) {
    return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('dosa') || lower.includes('jinny') || lower.includes('matka') || lower.includes('spring roll')) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('uttappa')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('sandwich') || lower.includes('toast') || lower.includes('grill') || lower.includes('bread')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('frankie') || lower.includes('roll')) {
    return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('blossom') || lower.includes('milkshake') || lower.includes('shake') || lower.includes('mastani')) {
    return 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('juice') || lower.includes('soda') || lower.includes('mojito') || lower.includes('punch') || lower.includes('dabang') || lower.includes('colada')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80';
  }
  if (lower.includes('coffee')) {
    return 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80';
  }

  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
}

async function seedAnandStall() {
  console.log('🌱 Starting Anand Stall data seeding...');
  await initDb();
  const db = await getDb();

  // 1. Insert/Update Canteen C6 (Anand Stall)
  const canteenData = {
    id: 'c6',
    name: 'Anand Stall (Fast Food & Juice Centre)',
    slug: 'anand-stall',
    group_name: null,
    group_slug: null,
    description: 'Legendary Mumbai fast food & juice centre since 1978. Famous for buttery vada pavs, jinny & matka dosas, gourmet grill sandwiches & fresh fruit blossoms.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'
  };

  await db.query(`
    INSERT INTO canteen (id, name, slug, group_name, group_slug, description, image)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      group_name = EXCLUDED.group_name,
      group_slug = EXCLUDED.group_slug,
      description = EXCLUDED.description,
      image = EXCLUDED.image
  `, [
    canteenData.id,
    canteenData.name,
    canteenData.slug,
    canteenData.group_name,
    canteenData.group_slug,
    canteenData.description,
    canteenData.image
  ]);
  console.log('✔ Anand Stall Canteen outlet registered (ID: c6, Slug: anand-stall).');

  // 2. Insert/Update Anand Stall Staff & Cook Accounts
  const users = [
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
    await db.query(`
      INSERT INTO users (id, username, email, password_hash, pin_hash, role, canteen_id, display_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        pin_hash = EXCLUDED.pin_hash,
        role = EXCLUDED.role,
        canteen_id = EXCLUDED.canteen_id,
        display_name = EXCLUDED.display_name,
        updated_at = NOW()
    `, [u.id, u.username, u.email, passwordHash, pinHash, u.role, u.canteen_id, u.display_name]);
  }
  console.log('✔ Anand Stall Manager (manager@anandstall.com), Cook (PIN: ANAND1), and Delivery (PIN: ANDEL1) accounts created.');

  // 3. Load & Insert all 267 Menu Items from anand_items_complete.json
  const itemsPath = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\97856faf-0c6f-4095-803e-e881a75fbff9\\scratch\\anand_items_complete.json';
  const rawItems = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

  console.log(`Inserting ${rawItems.length} menu items for Anand Stall...`);

  // Remove existing items for c6 to prevent duplicate key conflicts on re-seeding
  await db.query('DELETE FROM menu WHERE canteen_id = $1', ['c6']);

  let idx = 1;
  for (const item of rawItems) {
    const itemId = `anand_m${idx++}`;
    await db.query(`
      INSERT INTO menu (id, name, price, category, is_available, image, canteen_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      itemId,
      item.name,
      item.price,
      item.category,
      1,
      null,
      'c6'
    ]);
  }

  console.log(`🎉 Successfully seeded ${rawItems.length} official Anand Stall dishes into the database!`);
  process.exit(0);
}

seedAnandStall().catch(err => {
  console.error('Failed to seed Anand Stall:', err);
  process.exit(1);
});
