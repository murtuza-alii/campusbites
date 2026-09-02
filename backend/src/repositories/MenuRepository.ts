import { getDb } from '../db.js';
import { MenuItem } from '../types/index.js';

export class MenuRepository {
  async findAllPublic(canteenIdOrSlug?: string): Promise<MenuItem[]> {
    const db = await getDb();
    if (canteenIdOrSlug) {
      const result = await db.query<MenuItem>(
        'SELECT * FROM menu WHERE (canteen_id = $1 OR canteen_id = (SELECT id FROM canteen WHERE slug = $1 LIMIT 1)) ORDER BY category ASC, name ASC',
        [canteenIdOrSlug]
      );
      return result.rows;
    } else {
      const result = await db.query<MenuItem>('SELECT * FROM menu ORDER BY category ASC, name ASC');
      return result.rows;
    }
  }

  async findAllAdmin(canteenIdOrSlug?: string | string[]): Promise<MenuItem[]> {
    const db = await getDb();
    if (Array.isArray(canteenIdOrSlug)) {
      if (canteenIdOrSlug.length === 0) return [];
      const placeholders = canteenIdOrSlug.map((_, i) => `$${i + 1}`).join(',');
      const result = await db.query<MenuItem>(
        `SELECT * FROM menu WHERE canteen_id IN (${placeholders}) ORDER BY category ASC, name ASC`,
        canteenIdOrSlug
      );
      return result.rows;
    } else if (canteenIdOrSlug) {
      const result = await db.query<MenuItem>(
        'SELECT * FROM menu WHERE (canteen_id = $1 OR canteen_id = (SELECT id FROM canteen WHERE slug = $1 LIMIT 1)) ORDER BY category ASC, name ASC',
        [canteenIdOrSlug]
      );
      return result.rows;
    } else {
      const result = await db.query<MenuItem>('SELECT * FROM menu ORDER BY category ASC, name ASC');
      return result.rows;
    }
  }

  async findById(id: string): Promise<MenuItem | undefined> {
    const db = await getDb();
    const result = await db.query<MenuItem>('SELECT * FROM menu WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async create(item: { id: string; name: string; price: number; category: string; image: string; canteen_id: string }): Promise<void> {
    const db = await getDb();
    await db.query(
      'INSERT INTO menu (id, name, price, category, is_available, image, canteen_id) VALUES ($1, $2, $3, $4, 1, $5, $6)',
      [item.id, item.name, item.price, item.category, item.image, item.canteen_id]
    );
  }

  async update(id: string, item: { name: string; price: number; category: string; is_available: number; image: string; canteen_id?: string }): Promise<void> {
    const db = await getDb();
    if (item.canteen_id) {
      await db.query(
        'UPDATE menu SET name = $1, price = $2, category = $3, is_available = $4, image = $5, canteen_id = $6 WHERE id = $7',
        [item.name, item.price, item.category, item.is_available, item.image, item.canteen_id, id]
      );
    } else {
      await db.query(
        'UPDATE menu SET name = $1, price = $2, category = $3, is_available = $4, image = $5 WHERE id = $6',
        [item.name, item.price, item.category, item.is_available, item.image, id]
      );
    }
  }

  async updateAvailability(id: string, isAvailable: number): Promise<void> {
    const db = await getDb();
    await db.query('UPDATE menu SET is_available = $1 WHERE id = $2', [isAvailable, id]);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.query('DELETE FROM menu WHERE id = $1', [id]);
  }
}
