import { getDb } from '../db.js';
import { MenuItem } from '../types/index.js';

export class MenuRepository {
  async findAllPublic(): Promise<MenuItem[]> {
    const db = await getDb();
    return db.all<MenuItem[]>('SELECT * FROM menu WHERE is_available = 1');
  }

  async findAllAdmin(): Promise<MenuItem[]> {
    const db = await getDb();
    return db.all<MenuItem[]>('SELECT * FROM menu');
  }

  async findById(id: string): Promise<MenuItem | undefined> {
    const db = await getDb();
    return db.get<MenuItem>('SELECT * FROM menu WHERE id = ?', [id]);
  }

  async create(item: { id: string; name: string; price: number; category: string; image: string }): Promise<void> {
    const db = await getDb();
    await db.run(
      'INSERT INTO menu (id, name, price, category, is_available, image) VALUES (?, ?, ?, ?, 1, ?)',
      [item.id, item.name, item.price, item.category, item.image]
    );
  }

  async update(id: string, item: { name: string; price: number; category: string; is_available: number; image: string }): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE menu SET name = ?, price = ?, category = ?, is_available = ?, image = ? WHERE id = ?',
      [item.name, item.price, item.category, item.is_available, item.image, id]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM menu WHERE id = ?', [id]);
  }
}
