import { getDb } from '../db.js';
import { MenuItem } from '../types/index.js';
import { calculateHike } from '../utils/pricing.js';

export class MenuRepository {
  async findAllPublic(canteenIdOrSlug?: string): Promise<MenuItem[]> {
    const db = await getDb();
    if (canteenIdOrSlug) {
      const result = await db.query<MenuItem>(
        'SELECT * FROM menu WHERE (canteen_id = $1 OR canteen_id = (SELECT id FROM canteen WHERE slug = $1 LIMIT 1)) ORDER BY price ASC, name ASC',
        [canteenIdOrSlug]
      );
      return result.rows;
    } else {
      const result = await db.query<MenuItem>('SELECT * FROM menu ORDER BY price ASC, name ASC');
      return result.rows;
    }
  }

  async findAllAdmin(canteenIdOrSlug?: string | string[]): Promise<MenuItem[]> {
    const db = await getDb();
    if (Array.isArray(canteenIdOrSlug)) {
      if (canteenIdOrSlug.length === 0) return [];
      const placeholders = canteenIdOrSlug.map((_, i) => `$${i + 1}`).join(',');
      const result = await db.query<MenuItem>(
        `SELECT * FROM menu WHERE canteen_id IN (${placeholders}) ORDER BY price ASC, name ASC`,
        canteenIdOrSlug
      );
      return result.rows;
    } else if (canteenIdOrSlug) {
      const result = await db.query<MenuItem>(
        'SELECT * FROM menu WHERE (canteen_id = $1 OR canteen_id = (SELECT id FROM canteen WHERE slug = $1 LIMIT 1)) ORDER BY price ASC, name ASC',
        [canteenIdOrSlug]
      );
      return result.rows;
    } else {
      const result = await db.query<MenuItem>('SELECT * FROM menu ORDER BY price ASC, name ASC');
      return result.rows;
    }
  }

  async findById(id: string): Promise<MenuItem | undefined> {
    const db = await getDb();
    const result = await db.query<MenuItem>('SELECT * FROM menu WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async create(item: { id: string; name: string; price: number; price_hike?: number; category: string; image: string; canteen_id: string }): Promise<void> {
    const db = await getDb();
    const priceHike = item.price_hike !== undefined ? item.price_hike : calculateHike(item.price);
    await db.query(
      'INSERT INTO menu (id, name, price, price_hike, category, is_available, image, canteen_id) VALUES ($1, $2, $3, $4, $5, 1, $6, $7)',
      [item.id, item.name, item.price, priceHike, item.category, item.image, item.canteen_id]
    );
  }

  async update(id: string, item: { name: string; price: number; price_hike?: number; category: string; is_available: number; image: string; canteen_id?: string }): Promise<void> {
    const db = await getDb();
    const priceHike = item.price_hike !== undefined ? item.price_hike : calculateHike(item.price);
    if (item.canteen_id) {
      await db.query(
        'UPDATE menu SET name = $1, price = $2, price_hike = $3, category = $4, is_available = $5, image = $6, canteen_id = $7 WHERE id = $8',
        [item.name, item.price, priceHike, item.category, item.is_available, item.image, item.canteen_id, id]
      );
    } else {
      await db.query(
        'UPDATE menu SET name = $1, price = $2, price_hike = $3, category = $4, is_available = $5, image = $6 WHERE id = $7',
        [item.name, item.price, priceHike, item.category, item.is_available, item.image, id]
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
