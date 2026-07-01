import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config } from './config/unifiedConfig.js';

let dbConnection: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (dbConnection) return dbConnection;
  
  dbConnection = await open({
    filename: config.db.filename,
    driver: sqlite3.Database
  });
  
  return dbConnection;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  
  // Create menu table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS menu (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      image TEXT
    )
  `);
  
  // Create orders table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      student_roll TEXT NOT NULL,
      items TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL,
      pickup_code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Seed initial menu if empty
  const count = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM menu');
  if (count && count.count === 0) {
    const initialItems = [
      { id: 'm1', name: 'Paneer Tikka Roll', price: 80.0, category: 'Snacks', is_available: 1, image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=150&auto=format&fit=crop&q=60' },
      { id: 'm2', name: 'Cold Coffee', price: 50.0, category: 'Beverages', is_available: 1, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=150&auto=format&fit=crop&q=60' },
      { id: 'm3', name: 'Cheese Veg Burger', price: 70.0, category: 'Snacks', is_available: 1, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=60' },
      { id: 'm4', name: 'Masala Dosa', price: 60.0, category: 'Meals', is_available: 1, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=150&auto=format&fit=crop&q=60' },
      { id: 'm5', name: 'Samosa (2 pcs)', price: 20.0, category: 'Snacks', is_available: 1, image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=150&auto=format&fit=crop&q=60' },
      { id: 'm6', name: 'French Fries', price: 55.0, category: 'Snacks', is_available: 1, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=150&auto=format&fit=crop&q=60' },
      { id: 'm7', name: 'Mango Lassi', price: 40.0, category: 'Beverages', is_available: 1, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=150&auto=format&fit=crop&q=60' },
      { id: 'm8', name: 'Chocolate Brownie', price: 45.0, category: 'Desserts', is_available: 1, image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=150&auto=format&fit=crop&q=60' }
    ];
    
    const stmt = await db.prepare('INSERT INTO menu (id, name, price, category, is_available, image) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of initialItems) {
      await stmt.run(item.id, item.name, item.price, item.category, item.is_available, item.image);
    }
    await stmt.finalize();
    console.log('Database seeded with initial menu items.');
  }
}
